import "server-only";

import { logger } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import { persistGeneratedArtifact } from "@/lib/server/content-generation/artifacts";
import {
  fingerprintCapabilities,
  resolveEffectiveGenerationCapabilities,
} from "@/lib/server/content-generation/capabilities";
import {
  CONTENT_GENERATION_PIPELINE_VERSION,
  CONTENT_GENERATION_TEXT_PROMPT_VERSION,
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
import { content, pack, packItem, packItemContent } from "@/lib/server/db/schema";

function textByAnalysisItem(items: GeneratedTextItem[]) {
  return new Map(items.map((item) => [item.analysisItemId, item]));
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

  const capabilities = resolveEffectiveGenerationCapabilities();
  const capabilityFingerprint = fingerprintCapabilities(capabilities);
  const warnings: string[] = [];

  logger.info("[content-generation] resolved capabilities", {
    jobId,
    capabilityFingerprint,
    textMode: capabilities.textMode,
    textModel: capabilities.textModel,
    audioEnabled: capabilities.audioGenerationEnabled,
    audioMode: capabilities.audioMode,
    audioProvider: capabilities.audioProvider,
    imageEnabled: capabilities.imageGenerationEnabled,
    imageMode: capabilities.imageMode,
    imageProvider: capabilities.imageProvider,
  });

  try {
    await transitionPackGenerationJob({
      jobId,
      status: "running",
      stage: "selecting_terms",
      message: "Selecting vocabulary for this learner.",
      payload: { capabilities, capabilityFingerprint },
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
      capabilities,
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
      generateSpeechArtifacts({ selectedItems, textItems, capabilities }),
      generateImageArtifacts({ textItems, capabilities }),
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

    const existingPack = await db.query.pack.findFirst({
      where: and(eq(pack.userId, job.userId), eq(pack.contentId, job.contentId)),
    });
    if (existingPack) {
      logger.info("[content-generation] replacing existing pack", {
        jobId,
        existingPackId: existingPack.id,
      });
      await db.delete(pack).where(eq(pack.id, existingPack.id));
    }

    logger.info("[content-generation] creating pack", {
      jobId,
      packId,
      itemCount: selectedItems.length,
      estimatedStudyMinutes: Math.max(1, Math.ceil(selectedItems.length * 1.5)),
    });

    await db.insert(pack).values({
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
      contentGenerationPromptVersion: CONTENT_GENERATION_TEXT_PROMPT_VERSION,
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

      await db.insert(packItem).values({
        id: packItemId,
        packId,
        contentAnalysisItemId: item.analysisItemId,
        termId: item.termId,
        sortOrder: index + 1,
        includedReason: item.includedReason,
        dueAt: now,
      });
      await db.insert(packItemContent).values({
        packItemId,
        meaning: generated.meaning,
        exampleSentences: generated.exampleSentences,
        audioArtifactId: audioArtifacts.get(item.analysisItemId) ?? null,
        imageArtifactId: imageArtifacts.get(item.analysisItemId) ?? null,
        generatedAt: now,
      });
    }

    await transitionPackGenerationJob({
      jobId,
      status: "completed",
      stage: "completed",
      message: "Pack generation complete.",
      payload: { packId, warnings },
    });

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
    throw error;
  }
}
