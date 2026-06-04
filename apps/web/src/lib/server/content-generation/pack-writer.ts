import "server-only";

import { logger } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import {
  CONTENT_GENERATION_PIPELINE_VERSION,
  ESTIMATED_STUDY_MINUTES_PER_PACK_ITEM,
} from "@/lib/constants";
import type { GeneratedArtifactIndex } from "@/lib/server/content-generation/artifacts";
import type {
  GeneratedTextItem,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";
import type { PackGenerationJobRow } from "@/lib/server/content-generation/jobs";
import { db } from "@/lib/server/db";
import {
  pack,
  packGenerationJob,
  packGenerationJobEvent,
  packItem,
  packItemContent,
} from "@/lib/server/db/schema";

const COMPLETION_MESSAGE = "Pack generation complete.";

function estimateStudyMinutes(itemCount: number) {
  return Math.max(1, Math.ceil(itemCount * ESTIMATED_STUDY_MINUTES_PER_PACK_ITEM));
}

/**
 * Writes the generated pack, its items and the job completion transition in a single batch,
 * replacing any pack previously generated for the same user and content.
 */
export async function savePackGenerationResult(input: {
  job: PackGenerationJobRow;
  packTitle: string;
  selectedItems: SelectedGenerationItem[];
  textByItemId: Map<string, GeneratedTextItem>;
  artifacts: GeneratedArtifactIndex;
  warnings: string[];
}): Promise<{ packId: string }> {
  const packId = crypto.randomUUID();
  const now = new Date();

  const existingPack = await db.query.pack.findFirst({
    where: and(eq(pack.userId, input.job.userId), eq(pack.contentId, input.job.contentId)),
  });

  if (existingPack) {
    logger.info("[content-generation] replacing existing pack", {
      jobId: input.job.id,
      existingPackId: existingPack.id,
    });
  }

  const packItemRows = input.selectedItems.map((item, index) => ({
    id: crypto.randomUUID(),
    packId,
    contentAnalysisItemId: item.analysisItemId,
    termId: item.termId,
    sortOrder: index + 1,
    includedReason: item.includedReason,
    dueAt: now,
  }));

  const packItemContentRows = input.selectedItems.map((item, index) => {
    const generated = input.textByItemId.get(item.analysisItemId);
    if (!generated) {
      throw new Error(`Missing generated text for ${item.displayText}.`);
    }

    const exampleAudioIds =
      input.artifacts.exampleAudioArtifactIdsByItemId.get(item.analysisItemId) ?? [];

    return {
      packItemId: packItemRows[index].id,
      meaning: generated.meaning,
      exampleSentences: generated.exampleSentences,
      audioArtifactId: input.artifacts.termAudioArtifactIdByItemId.get(item.analysisItemId) ?? null,
      exampleSentenceAudioArtifactIds:
        generated.exampleSentences.length > 0
          ? generated.exampleSentences.map(
              (_, exampleIndex) => exampleAudioIds[exampleIndex] ?? null,
            )
          : null,
      imageArtifactId: input.artifacts.imageArtifactIdByItemId.get(item.analysisItemId) ?? null,
      generatedAt: now,
    };
  });

  const writes = [
    db.insert(pack).values({
      id: packId,
      userId: input.job.userId,
      contentId: input.job.contentId,
      sourceJobId: input.job.id,
      analysisRunId: input.job.analysisRunId ?? "",
      status: "active",
      name: `${input.packTitle} vocabulary`,
      learnerCefrLevelAtGeneration: input.job.requestSnapshot.learnerCefrLevel,
      frequencyPreferenceAtGeneration: input.job.requestSnapshot.frequencyPreference,
      selectedVocabularyTypes: input.job.requestSnapshot.selectedVocabularyTypes,
      contentGenerationPipelineVersion: CONTENT_GENERATION_PIPELINE_VERSION,
      contentGenerationPromptVersion: CONTENT_GENERATION_PIPELINE_VERSION,
      itemCount: input.selectedItems.length,
      estimatedStudyMinutes: estimateStudyMinutes(input.selectedItems.length),
    }),
    db.insert(packItem).values(packItemRows),
    db.insert(packItemContent).values(packItemContentRows),
    db
      .update(packGenerationJob)
      .set({
        status: "completed",
        stage: "completed",
        progressMessage: COMPLETION_MESSAGE,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(packGenerationJob.id, input.job.id)),
    db.insert(packGenerationJobEvent).values({
      id: crypto.randomUUID(),
      jobId: input.job.id,
      stage: "completed",
      message: COMPLETION_MESSAGE,
      payload: { packId, warnings: input.warnings },
    }),
  ] as const;

  logger.info("[content-generation] creating pack", {
    jobId: input.job.id,
    packId,
    itemCount: input.selectedItems.length,
    replacedPackId: existingPack?.id,
  });

  if (existingPack) {
    await db.batch([db.delete(pack).where(eq(pack.id, existingPack.id)), ...writes]);
  } else {
    await db.batch([...writes]);
  }

  return { packId };
}
