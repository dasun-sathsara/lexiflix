import "server-only";

import { logger } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { env } from "@/lib/config/env";
import {
  discardPersistedArtifacts,
  persistGeneratedArtifacts,
} from "@/lib/server/content-generation/artifacts";
import type { GeneratedTextItem } from "@/lib/server/content-generation/contracts";
import {
  getPackGenerationJobById,
  recordPackGenerationJobTransition,
} from "@/lib/server/content-generation/jobs";
import { notifyPackFailed, notifyPackReady } from "@/lib/server/content-generation/notifications";
import { savePackGenerationResult } from "@/lib/server/content-generation/pack-writer";
import { generateImageArtifacts } from "@/lib/server/content-generation/providers/image";
import { generateSpeechArtifacts } from "@/lib/server/content-generation/providers/speech";
import { generateTextContent } from "@/lib/server/content-generation/providers/text";
import { selectGenerationItems } from "@/lib/server/content-generation/selection";
import { db } from "@/lib/server/db";
import { content, pack } from "@/lib/server/db/schema";

const DEFAULT_PACK_TITLE = "Generated";

export type PackGenerationWorkflowResult = {
  packId: string | undefined;
  warnings: string[];
};

async function getContentTitle(contentId: string) {
  const contentRow = await db.query.content.findFirst({ where: eq(content.id, contentId) });
  return contentRow?.title ?? DEFAULT_PACK_TITLE;
}

export async function runPackGenerationWorkflow(
  jobId: string,
): Promise<PackGenerationWorkflowResult> {
  logger.info("[content-generation] starting workflow", { jobId });

  const job = await getPackGenerationJobById(jobId);
  if (!job) {
    throw new Error(`Pack generation job ${jobId} was not found.`);
  }

  if (job.status === "completed") {
    const existing = await db.query.pack.findFirst({ where: eq(pack.sourceJobId, job.id) });
    logger.info("[content-generation] job already completed; skipping", {
      jobId,
      packId: existing?.id,
    });
    return { packId: existing?.id, warnings: [] };
  }

  const warnings: string[] = [];

  try {
    await recordPackGenerationJobTransition({
      jobId,
      status: "running",
      stage: "selecting_terms",
      message: "Selecting vocabulary for this learner.",
      payload: {
        textModel: env.CONTENT_GENERATION_TEXT_MODEL,
        audioProvider: env.CONTENT_GENERATION_AUDIO_PROVIDER,
        imageEnabled: env.CONTENT_GENERATION_IMAGE_ENABLED && job.requestSnapshot.imageEnabled,
        imageModel: env.CONTENT_GENERATION_IMAGE_MODEL,
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

    await recordPackGenerationJobTransition({
      jobId,
      status: "running",
      stage: "generating_content",
      message: `Generating text content for ${selectedItems.length} items.`,
      payload: { selectedItemCount: selectedItems.length },
    });

    const textItems = await generateTextContent({
      items: selectedItems,
      requestSnapshot: job.requestSnapshot,
    });
    const textByItemId = new Map<string, GeneratedTextItem>(
      textItems.map((item) => [item.analysisItemId, item]),
    );

    const missingTextItems = selectedItems.filter((item) => !textByItemId.has(item.analysisItemId));
    for (const item of missingTextItems) {
      warnings.push(
        `Skipped '${item.displayText}': text generation did not return content for this item.`,
      );
    }
    selectedItems = selectedItems.filter((item) => textByItemId.has(item.analysisItemId));

    logger.info("[content-generation] text content generated", {
      jobId,
      generatedTextItemCount: textItems.length,
      selectionItemCount: selectedItems.length,
      missingTextItemCount: missingTextItems.length,
      warningCount: textItems.reduce((count, item) => count + item.warnings.length, 0),
      imageEligibleCount: textItems.filter((item) => item.imageEligibility.eligible).length,
    });

    await recordPackGenerationJobTransition({
      jobId,
      status: "running",
      stage: "generating_assets",
      message: "Generating best-effort learning assets.",
    });

    const speechResult = await generateSpeechArtifacts({
      selectedItems,
      textItems,
      voiceGender: job.requestSnapshot.audioVoiceGender,
    });
    const imageResult = await generateImageArtifacts({
      selectedItems,
      textItems,
      requested: job.requestSnapshot.imageEnabled,
    });
    warnings.push(...speechResult.warnings, ...imageResult.warnings);

    logger.info("[content-generation] asset generation completed", {
      jobId,
      audioArtifactCount: speechResult.artifacts.length,
      audioWarningCount: speechResult.warnings.length,
      imageArtifactCount: imageResult.artifacts.length,
      imageWarningCount: imageResult.warnings.length,
    });

    const artifacts = await persistGeneratedArtifacts({
      userId: job.userId,
      contentId: job.contentId,
      jobId,
      speechArtifacts: speechResult.artifacts,
      imageArtifacts: imageResult.artifacts,
    });
    warnings.push(...artifacts.warnings);

    await recordPackGenerationJobTransition({
      jobId,
      status: "running",
      stage: "saving_pack",
      message: "Saving generated pack.",
      payload: {
        attemptedAudioCount: speechResult.artifacts.length,
        attemptedImageCount: imageResult.artifacts.length,
        persistedArtifactCount: artifacts.uploadedArtifactIds.length,
        warnings,
      },
    });

    const packTitle = await getContentTitle(job.contentId);

    let packId: string;
    try {
      ({ packId } = await savePackGenerationResult({
        job,
        packTitle,
        selectedItems,
        textByItemId,
        artifacts,
        warnings,
      }));
    } catch (error) {
      await discardPersistedArtifacts(artifacts);
      throw error;
    }

    try {
      await notifyPackReady({ userId: job.userId, jobId, packId, packTitle });
    } catch (error) {
      warnings.push(
        error instanceof Error ? error.message : "Failed to create pack-ready notification.",
      );
      await recordPackGenerationJobTransition({
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

    await recordPackGenerationJobTransition({
      jobId,
      status: "failed",
      stage: "failed",
      message,
      errorCode: "PACK_GENERATION_FAILED",
      errorMessage: message,
      payload: { warnings },
    });

    try {
      await notifyPackFailed({
        userId: job.userId,
        jobId,
        packTitle: await getContentTitle(job.contentId),
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

    throw error;
  }
}
