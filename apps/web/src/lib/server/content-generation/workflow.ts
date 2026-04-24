import "server-only";

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

export async function runPackGenerationWorkflow(jobId: string) {
  const job = await getPackGenerationJobById(jobId);
  if (!job) {
    throw new Error(`Pack generation job ${jobId} was not found.`);
  }

  const capabilities = resolveEffectiveGenerationCapabilities();
  const capabilityFingerprint = fingerprintCapabilities(capabilities);
  const warnings: string[] = [];

  try {
    await recordPackGenerationJobTransition({
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
      capabilities,
    });
    const textMap = textByAnalysisItem(textItems);

    await recordPackGenerationJobTransition({
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

    const audioArtifacts = new Map<string, string>();
    const imageArtifacts = new Map<string, string>();

    for (const artifact of speechResult.artifacts) {
      try {
        const row = await persistGeneratedArtifact({
          userId: job.userId,
          contentId: job.contentId,
          jobId,
          kind: "audio",
          artifact,
        });
        audioArtifacts.set(artifact.itemKey, row.id);
      } catch (error) {
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
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : "Failed to persist image artifact.");
      }
    }

    await recordPackGenerationJobTransition({
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

    await db.transaction(async (tx) => {
      const existingPack = await tx.query.pack.findFirst({
        where: and(eq(pack.userId, job.userId), eq(pack.contentId, job.contentId)),
      });
      if (existingPack) {
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
    });

    await recordPackGenerationJobTransition({
      jobId,
      status: "completed",
      stage: "completed",
      message: "Pack generation complete.",
      payload: { packId, warnings },
    });

    return { packId, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pack generation failed.";
    await recordPackGenerationJobTransition({
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
