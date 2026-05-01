import "server-only";

import { logger } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import {
  createPackFailedNotification,
  createPackReadyNotification,
} from "@/features/notifications/server/queries";
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
import { generateTextContent } from "@/lib/server/content-generation/providers/text/gemini";
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
} from "@/lib/server/db/schema";
import { deleteObjectByKey } from "@/lib/storage/r2";

function textByAnalysisItem(items: GeneratedTextItem[]) {
  return new Map(items.map((item) => [item.analysisItemId, item]));
}

function getAudioConfig() {
  const audioVoice =
    env.CONTENT_GENERATION_AUDIO_PROVIDER === "aws-polly"
      ? env.AWS_POLLY_ENGINE === "neural"
        ? env.AWS_POLLY_NEURAL_VOICE_ID
        : env.AWS_POLLY_STANDARD_VOICE_ID
      : env.CONTENT_GENERATION_AUDIO_VOICE;

  return {
    audioProvider: env.CONTENT_GENERATION_AUDIO_PROVIDER,
    audioVoice,
    audioEngine: env.AWS_POLLY_ENGINE,
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
  logger.info(`[content-generation] ${input.stage}`, {
    jobId: input.jobId,
    status: input.status,
    message: input.message,
    ...input.payload,
  });

  await recordPackGenerationJobTransition(input);
}

export async function runPackGenerationWorkflow(jobId: string) {
  logger.info("[content-generation] starting workflow", { jobId });

  const job = await getPackGenerationJobById(jobId);
  if (!job) {
    throw new Error(`Pack generation job ${jobId} was not found.`);
  }

  logger.info("[content-generation] resolved job", {
    jobId,
    userId: job.userId,
    contentId: job.contentId,
    analysisRunId: job.analysisRunId,
    status: job.status,
    stage: job.stage,
    packSize: job.requestSnapshot.packSize,
    frequencyPreference: job.requestSnapshot.frequencyPreference,
    selectedVocabularyTypes: job.requestSnapshot.selectedVocabularyTypes,
  });

  const audioConfig = getAudioConfig();
  const warnings: string[] = [];

  logger.info("[content-generation] resolved capabilities", {
    jobId,
    textModel: env.CONTENT_GENERATION_TEXT_MODEL,
    audioEnabled: audioConfig.audioProvider !== "disabled",
    audioProvider: audioConfig.audioProvider,
    imageEnabled: env.CONTENT_GENERATION_IMAGE_ENABLED,
    imageProvider: env.CONTENT_GENERATION_IMAGE_PROVIDER,
  });

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

    const selectedItems = await selectGenerationItems({
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
      selectedKinds: [...new Set(selectedItems.map((item) => item.kind))],
      firstItems: selectedItems.slice(0, 5).map((item) => ({
        analysisItemId: item.analysisItemId,
        termId: item.termId,
        displayText: item.displayText,
        kind: item.kind,
        cefrLevel: item.cefrLevel,
      })),
    });

    await transitionPackGenerationJob({
      jobId,
      status: "running",
      stage: "generating_content",
      message: `Generating text content for ${selectedItems.length} items.`,
      payload: { selectedItemCount: selectedItems.length },
    });

    const textItems = await generateTextContent({
      items: selectedItems,
      requestSnapshot: job.requestSnapshot,
      model: env.CONTENT_GENERATION_TEXT_MODEL,
    });
    const textMap = textByAnalysisItem(textItems);

    logger.info("[content-generation] text content generated", {
      jobId,
      generatedTextItemCount: textItems.length,
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
    const imageArtifacts = new Map<string, string>();
    const uploadedObjectKeys: string[] = [];
    const uploadedArtifactIds: string[] = [];

    for (const artifact of speechResult.artifacts) {
      try {
        logger.info("[content-generation] persisting audio artifact", {
          jobId,
          itemKey: artifact.itemKey,
          mimeType: artifact.mimeType,
          byteLength: artifact.bytes.byteLength,
        });

        const row = await persistGeneratedArtifact({
          userId: job.userId,
          contentId: job.contentId,
          jobId,
          kind: "audio",
          artifact,
        });
        audioArtifacts.set(artifact.itemKey, row.id);
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
        logger.info("[content-generation] persisting image artifact", {
          jobId,
          itemKey: artifact.itemKey,
          mimeType: artifact.mimeType,
          byteLength: artifact.bytes.byteLength,
        });

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
      await db.transaction(async (tx) => {
        const existingPack = await tx.query.pack.findFirst({
          where: and(eq(pack.userId, job.userId), eq(pack.contentId, job.contentId)),
        });
        if (existingPack) {
          logger.info("[content-generation] replacing existing pack", {
            jobId,
            existingPackId: existingPack.id,
          });
          await tx.delete(pack).where(eq(pack.id, existingPack.id));
        }

        await tx.insert(pack).values({
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

        for (const [index, item] of selectedItems.entries()) {
          const packItemId = crypto.randomUUID();
          const generated = textMap.get(item.analysisItemId);
          if (!generated) {
            throw new Error(`Missing generated text for ${item.displayText}.`);
          }

          logger.info("[content-generation] saving pack item", {
            jobId,
            packId,
            packItemId,
            sortOrder: index + 1,
            analysisItemId: item.analysisItemId,
            termId: item.termId,
            displayText: item.displayText,
            hasAudio: audioArtifacts.has(item.analysisItemId),
            hasImage: imageArtifacts.has(item.analysisItemId),
          });

          await tx.insert(packItem).values({
            id: packItemId,
            packId,
            contentAnalysisItemId: item.analysisItemId,
            termId: item.termId,
            sortOrder: index + 1,
            includedReason: item.includedReason,
            dueAt: now,
          });
          await tx.insert(packItemContent).values({
            packItemId,
            meaning: generated.meaning,
            exampleSentences: generated.exampleSentences,
            audioArtifactId: audioArtifacts.get(item.analysisItemId) ?? null,
            imageArtifactId: imageArtifacts.get(item.analysisItemId) ?? null,
            generatedAt: now,
          });
        }

        await tx
          .update(packGenerationJob)
          .set({
            status: "completed",
            stage: "completed",
            progressMessage: "Pack generation complete.",
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(packGenerationJob.id, jobId));
        await tx.insert(packGenerationJobEvent).values({
          id: crypto.randomUUID(),
          jobId,
          stage: "completed",
          message: "Pack generation complete.",
          payload: { packId, warnings },
        });
      });
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
