import "server-only";

import { logger } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import {
  createPackFailedNotification,
  createPackReadyNotification,
} from "@/features/notifications/server/queries";
import { getSettingsPreferences } from "@/features/settings/server/preferences";
import { sendPackStatusEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { persistGeneratedArtifact } from "@/lib/server/content-generation/artifacts";
import {
  CONTENT_GENERATION_PIPELINE_VERSION,
  type GeneratedTextItem,
} from "@/lib/server/content-generation/contracts";
import {
  getPackGenerationJobById,
  recordPackGenerationJobTransition,
} from "@/lib/server/content-generation/jobs";
import { generateImageArtifacts } from "@/lib/server/content-generation/providers/image";
import { generateSpeechArtifacts } from "@/lib/server/content-generation/providers/speech";
import { getSpeechArtifactTarget } from "@/lib/server/content-generation/providers/speech/helpers";
import { generateTextContent as generateTextWithAzureFoundry } from "@/lib/server/content-generation/providers/text/azure-foundry";
import { generateTextContent as generateTextWithGemini } from "@/lib/server/content-generation/providers/text/gemini";
import { selectGenerationItems } from "@/lib/server/content-generation/selection";
import { db } from "@/lib/server/db";
import {
  artifactObject,
  content,
  pack,
  packGenerationJob,
  packGenerationJobEvent,
  packItem,
  packItemContent,
  user as userTable,
} from "@/lib/server/db/schema";
import { deleteObjectByKey } from "@/lib/storage/r2";

function textByAnalysisItem(items: GeneratedTextItem[]) {
  return new Map(items.map((item) => [item.analysisItemId, item]));
}

async function sendPackStatusEmailIfEnabled({
  userId,
  status,
  packTitle,
  jobId,
  packId,
}: {
  userId: string;
  status: "completed" | "failed";
  packTitle: string;
  jobId: string;
  packId?: string;
}) {
  try {
    const [userRow, preferences] = await Promise.all([
      db.query.user.findFirst({ where: eq(userTable.id, userId) }),
      getSettingsPreferences(userId),
    ]);

    if (!userRow || !preferences.emailRemindersEnabled) return;

    const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const actionUrl =
      status === "completed" && packId
        ? `${baseUrl}/pack/${packId}`
        : `${baseUrl}/generation/${jobId}`;

    await sendPackStatusEmail({
      email: userRow.email,
      userName: userRow.name,
      status,
      packTitle,
      actionUrl,
    });
  } catch (error) {
    logger.warn("[content-generation] failed to send pack status email", {
      jobId,
      status,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function getAudioConfig(voiceGender?: "female" | "male") {
  const normalizedVoiceGender = voiceGender === "male" ? "male" : "female";
  const pollyVoiceByGender = normalizedVoiceGender === "male" ? "Matthew" : "Joanna";
  const azureMaiVoiceByGender =
    normalizedVoiceGender === "male" ? env.AZURE_MAI_VOICE_MALE : env.AZURE_MAI_VOICE_FEMALE;
  const audioVoice =
    env.CONTENT_GENERATION_AUDIO_PROVIDER === "aws-polly"
      ? pollyVoiceByGender
      : env.CONTENT_GENERATION_AUDIO_PROVIDER === "azure-mai"
        ? azureMaiVoiceByGender
        : env.CONTENT_GENERATION_AUDIO_VOICE;

  return {
    audioProvider: env.CONTENT_GENERATION_AUDIO_PROVIDER,
    audioVoice,
    audioEngine: env.AWS_POLLY_ENGINE,
    audioStyle: env.AZURE_MAI_VOICE_STYLE,
  };
}

async function transitionPackGenerationJob(input: {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  stage:
    | "queued"
    | "selecting_terms"
    | "generating_content"
    | "generating_assets"
    | "saving_pack"
    | "completed"
    | "failed";
  message: string;
  errorCode?: string;
  errorMessage?: string;
  payload?: Record<string, unknown>;
}) {
  await recordPackGenerationJobTransition(input);
}

export async function runPackGenerationWorkflow(jobId: string) {
  logger.info("[content-generation] starting workflow", { jobId });

  const job = await getPackGenerationJobById(jobId);
  if (!job) {
    throw new Error(`Pack generation job ${jobId} was not found.`);
  }

  if (job.status === "completed") {
    const existing = await db.query.pack.findFirst({
      where: eq(pack.sourceJobId, job.id),
    });
    logger.info("[content-generation] job already completed; skipping", {
      jobId,
      packId: existing?.id,
    });
    return { packId: existing?.id, warnings: [] as string[] };
  }

  const audioConfig = getAudioConfig(job.requestSnapshot.audioVoiceGender);
  const warnings: string[] = [];

  try {
    await transitionPackGenerationJob({
      jobId,
      status: "running",
      stage: "selecting_terms",
      message: "Selecting vocabulary for this learner.",
      payload: {
        textModel: env.CONTENT_GENERATION_TEXT_MODEL,
        audioEnabled: audioConfig.audioProvider !== "disabled",
        audioProvider: audioConfig.audioProvider,
        imageEnabled: env.CONTENT_GENERATION_IMAGE_ENABLED,
        imageProvider: env.CONTENT_GENERATION_IMAGE_PROVIDER,
      },
    });

    let selectedItems = await selectGenerationItems({
      userId: job.userId,
      contentId: job.contentId,
      analysisRunId: job.analysisRunId ?? "",
      requestSnapshot: job.requestSnapshot,
    });

    if (selectedItems.length === 0) {
      throw new Error("No selectable vocabulary items matched the generation request.");
    }

    logger.info("[content-generation] selected terms", {
      jobId,
      selectedItemCount: selectedItems.length,
    });

    await transitionPackGenerationJob({
      jobId,
      status: "running",
      stage: "generating_content",
      message: `Generating text content for ${selectedItems.length} items.`,
      payload: { selectedItemCount: selectedItems.length },
    });

    const textItems =
      env.TEXT_LLM_PROVIDER === "azure-foundry"
        ? await generateTextWithAzureFoundry({
            items: selectedItems,
            requestSnapshot: job.requestSnapshot,
            model: env.AZURE_AI_FOUNDRY_MODEL ?? "gpt-5.4-nano",
          })
        : await generateTextWithGemini({
            items: selectedItems,
            requestSnapshot: job.requestSnapshot,
            model: env.CONTENT_GENERATION_TEXT_MODEL,
          });
    const textMap = textByAnalysisItem(textItems);
    const missingTextItems = selectedItems.filter((item) => !textMap.has(item.analysisItemId));
    if (missingTextItems.length > 0) {
      for (const item of missingTextItems) {
        warnings.push(
          `Skipped '${item.displayText}': text generation did not return content for this item.`,
        );
      }
      selectedItems = selectedItems.filter((item) => textMap.has(item.analysisItemId));
    }

    logger.info("[content-generation] text content generated", {
      jobId,
      generatedTextItemCount: textItems.length,
      selectionItemCount: selectedItems.length,
      missingTextItemCount: missingTextItems.length,
      warningCount: textItems.reduce((count, item) => count + item.warnings.length, 0),
      imageEligibleCount: textItems.filter((item) => item.imageEligibility.eligible).length,
    });

    await transitionPackGenerationJob({
      jobId,
      status: "running",
      stage: "generating_assets",
      message: "Generating best-effort learning assets.",
    });

    const [speechResult, imageResult] = await Promise.all([
      generateSpeechArtifacts({ selectedItems, textItems, audioConfig }),
      generateImageArtifacts({
        textItems,
        imageEnabled: env.CONTENT_GENERATION_IMAGE_ENABLED,
        imageProvider: env.CONTENT_GENERATION_IMAGE_PROVIDER,
      }),
    ]);
    warnings.push(...speechResult.warnings, ...imageResult.warnings);

    logger.info("[content-generation] asset generation completed", {
      jobId,
      audioArtifactCount: speechResult.artifacts.length,
      audioWarningCount: speechResult.warnings.length,
      imageArtifactCount: imageResult.artifacts.length,
      imageWarningCount: imageResult.warnings.length,
    });

    const audioArtifacts = new Map<string, string>();
    const exampleSentenceAudioArtifacts = new Map<string, Array<string | null>>();
    const imageArtifacts = new Map<string, string>();
    const uploadedObjectKeys: string[] = [];
    const uploadedArtifactIds: string[] = [];

    for (const artifact of speechResult.artifacts) {
      try {
        const row = await persistGeneratedArtifact({
          userId: job.userId,
          contentId: job.contentId,
          jobId,
          kind: "audio",
          artifact,
        });
        const speechTarget = getSpeechArtifactTarget(artifact.metadata);
        if (
          speechTarget?.speechTarget === "example_sentence" &&
          speechTarget.exampleIndex !== null
        ) {
          const current = exampleSentenceAudioArtifacts.get(speechTarget.analysisItemId) ?? [];
          current[speechTarget.exampleIndex] = row.id;
          exampleSentenceAudioArtifacts.set(speechTarget.analysisItemId, current);
        } else if (speechTarget?.speechTarget === "term") {
          audioArtifacts.set(speechTarget.analysisItemId, row.id);
        } else {
          audioArtifacts.set(artifact.itemKey, row.id);
        }
        uploadedObjectKeys.push(row.objectKey);
        uploadedArtifactIds.push(row.id);
      } catch (error) {
        logger.error("[content-generation] failed to persist audio artifact", {
          jobId,
          itemKey: artifact.itemKey,
          message: error instanceof Error ? error.message : String(error),
        });
        warnings.push(error instanceof Error ? error.message : "Failed to persist audio artifact.");
      }
    }

    for (const artifact of imageResult.artifacts) {
      try {
        const row = await persistGeneratedArtifact({
          userId: job.userId,
          contentId: job.contentId,
          jobId,
          kind: "image",
          artifact,
        });
        imageArtifacts.set(artifact.itemKey, row.id);
        uploadedObjectKeys.push(row.objectKey);
        uploadedArtifactIds.push(row.id);
      } catch (error) {
        logger.error("[content-generation] failed to persist image artifact", {
          jobId,
          itemKey: artifact.itemKey,
          message: error instanceof Error ? error.message : String(error),
        });
        warnings.push(error instanceof Error ? error.message : "Failed to persist image artifact.");
      }
    }

    await transitionPackGenerationJob({
      jobId,
      status: "running",
      stage: "saving_pack",
      message: "Saving generated pack.",
      payload: {
        attemptedAudioCount: speechResult.artifacts.length,
        successfulAudioCount: audioArtifacts.size,
        attemptedImageCount: imageResult.artifacts.length,
        successfulImageCount: imageArtifacts.size,
        warnings,
      },
    });

    const contentRow = await db.query.content.findFirst({ where: eq(content.id, job.contentId) });
    const packId = crypto.randomUUID();
    const now = new Date();

    logger.info("[content-generation] creating pack", {
      jobId,
      packId,
      itemCount: selectedItems.length,
      estimatedStudyMinutes: Math.max(1, Math.ceil(selectedItems.length * 1.5)),
    });

    try {
      const existingPack = await db.query.pack.findFirst({
        where: and(eq(pack.userId, job.userId), eq(pack.contentId, job.contentId)),
      });
      if (existingPack) {
        logger.info("[content-generation] replacing existing pack", {
          jobId,
          existingPackId: existingPack.id,
        });
      }

      const packItemRows = selectedItems.map((item, index) => ({
        id: crypto.randomUUID(),
        packId,
        contentAnalysisItemId: item.analysisItemId,
        termId: item.termId,
        sortOrder: index + 1,
        includedReason: item.includedReason,
        dueAt: now,
      }));
      const packItemContentRows = selectedItems.map((item, index) => {
        const generated = textMap.get(item.analysisItemId);
        if (!generated) {
          throw new Error(`Missing generated text for ${item.displayText}.`);
        }

        return {
          packItemId: packItemRows[index].id,
          meaning: generated.meaning,
          exampleSentences: generated.exampleSentences,
          audioArtifactId: audioArtifacts.get(item.analysisItemId) ?? null,
          exampleSentenceAudioArtifactIds:
            generated.exampleSentences.length > 0
              ? Array.from(
                  { length: generated.exampleSentences.length },
                  (_, exampleIndex) =>
                    (exampleSentenceAudioArtifacts.get(item.analysisItemId) ?? [])[exampleIndex] ??
                    null,
                )
              : null,
          imageArtifactId: imageArtifacts.get(item.analysisItemId) ?? null,
          generatedAt: now,
        };
      });

      const insertPackQuery = db.insert(pack).values({
        id: packId,
        userId: job.userId,
        contentId: job.contentId,
        sourceJobId: job.id,
        analysisRunId: job.analysisRunId ?? "",
        status: "active",
        name: `${contentRow?.title ?? "Generated"} vocabulary`,
        learnerCefrLevelAtGeneration: job.requestSnapshot.learnerCefrLevel,
        frequencyPreferenceAtGeneration: job.requestSnapshot.frequencyPreference,
        selectedVocabularyTypes: job.requestSnapshot.selectedVocabularyTypes,
        contentGenerationPipelineVersion: CONTENT_GENERATION_PIPELINE_VERSION,
        contentGenerationPromptVersion: CONTENT_GENERATION_PIPELINE_VERSION,
        itemCount: selectedItems.length,
        estimatedStudyMinutes: Math.max(1, Math.ceil(selectedItems.length * 1.5)),
      });
      const insertPackItemsQuery = db.insert(packItem).values(packItemRows);
      const insertPackItemContentQuery = db.insert(packItemContent).values(packItemContentRows);
      const completeJobQuery = db
        .update(packGenerationJob)
        .set({
          status: "completed",
          stage: "completed",
          progressMessage: "Pack generation complete.",
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(packGenerationJob.id, jobId));
      const completeEventQuery = db.insert(packGenerationJobEvent).values({
        id: crypto.randomUUID(),
        jobId,
        stage: "completed",
        message: "Pack generation complete.",
        payload: { packId, warnings },
      });

      if (existingPack) {
        await db.batch([
          db.delete(pack).where(eq(pack.id, existingPack.id)),
          insertPackQuery,
          insertPackItemsQuery,
          insertPackItemContentQuery,
          completeJobQuery,
          completeEventQuery,
        ]);
      } else {
        await db.batch([
          insertPackQuery,
          insertPackItemsQuery,
          insertPackItemContentQuery,
          completeJobQuery,
          completeEventQuery,
        ]);
      }
    } catch (error) {
      await Promise.allSettled(uploadedObjectKeys.map((key) => deleteObjectByKey(key)));
      await Promise.allSettled(
        uploadedArtifactIds.map((id) => db.delete(artifactObject).where(eq(artifactObject.id, id))),
      );
      throw error;
    }

    try {
      await createPackReadyNotification({
        userId: job.userId,
        jobId,
        packId,
        title: contentRow?.title ?? "Generated",
      });
      await sendPackStatusEmailIfEnabled({
        userId: job.userId,
        status: "completed",
        packTitle: contentRow?.title ?? "Generated",
        jobId,
        packId,
      });
    } catch (error) {
      const warning =
        error instanceof Error ? error.message : "Failed to create pack-ready notification.";
      warnings.push(warning);
      await transitionPackGenerationJob({
        jobId,
        status: "completed",
        stage: "completed",
        message: "Pack generation complete, but notification creation failed.",
        payload: { packId, warnings },
      });
    }

    logger.info("[content-generation] workflow completed", {
      jobId,
      packId,
      warningCount: warnings.length,
    });

    return { packId, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pack generation failed.";
    logger.error("[content-generation] workflow failed", {
      jobId,
      message,
      warningCount: warnings.length,
    });

    await transitionPackGenerationJob({
      jobId,
      status: "failed",
      stage: "failed",
      message,
      errorCode: "PACK_GENERATION_FAILED",
      errorMessage: message,
      payload: { warnings },
    });
    const failedJob = await getPackGenerationJobById(jobId);
    const failedContent = failedJob
      ? await db.query.content.findFirst({ where: eq(content.id, failedJob.contentId) })
      : null;
    if (failedJob) {
      try {
        await createPackFailedNotification({
          userId: failedJob.userId,
          jobId,
          title: failedContent?.title ?? "Generated",
        });
        await sendPackStatusEmailIfEnabled({
          userId: failedJob.userId,
          status: "failed",
          packTitle: failedContent?.title ?? "Generated",
          jobId,
        });
      } catch (notificationError) {
        logger.warn("[content-generation] failed to create failure notification", {
          jobId,
          message:
            notificationError instanceof Error
              ? notificationError.message
              : String(notificationError),
        });
      }
    }
    throw error;
  }
}
