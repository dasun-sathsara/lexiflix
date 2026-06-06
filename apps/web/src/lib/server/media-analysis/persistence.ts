import "server-only";

import { eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { ANALYSIS_ITEM_INSERT_CHUNK_SIZE, MAX_CONTEXTS_PER_ANALYSIS_ITEM } from "@/lib/constants";
import { normalizeContextList } from "@/lib/domain/contexts";
import { db } from "@/lib/server/db";
import type { ContentAnalysisSummary } from "@/lib/server/db/json-contracts";
import {
  contentAnalysisItem,
  contentAnalysisRun,
  contentAnalysisRunEvent,
  vocabularyTerm,
} from "@/lib/server/db/schema";
import type { MergedAnalysisItem } from "@/lib/server/media-analysis/merge";
import { analysisItemKey } from "@/lib/server/media-analysis/terms";

type AnalysisItemInsert = typeof contentAnalysisItem.$inferInsert;

const COMPLETION_MESSAGE = "Analysis completed.";

/**
 * Upserts the shared vocabulary catalog rows for this run and returns their ids keyed by
 * kind and normalized text.
 */
async function upsertVocabularyTerms(items: MergedAnalysisItem[]) {
  const termIdByItemKey = new Map<string, string>();
  if (items.length === 0) {
    return termIdByItemKey;
  }

  const rows = await db
    .insert(vocabularyTerm)
    .values(
      items.map((item) => ({
        id: crypto.randomUUID(),
        kind: item.kind,
        normalizedText: item.normalizedText,
        displayText: item.displayText,
        lemma: item.lemma,
        partOfSpeech: item.partOfSpeech,
        baseCefrLevel: item.cefrLevel,
        baseCefrNumeric: item.cefrNumeric,
        notes: item.notes,
      })),
    )
    .onConflictDoUpdate({
      target: [vocabularyTerm.kind, vocabularyTerm.normalizedText],
      set: {
        displayText: sql`excluded.display_text`,
        lemma: sql`excluded.lemma`,
        partOfSpeech: sql`excluded.part_of_speech`,
        baseCefrLevel: sql`excluded.base_cefr_level`,
        baseCefrNumeric: sql`excluded.base_cefr_numeric`,
        notes: sql`excluded.notes`,
        // `$onUpdate` only fires for `update()` statements, so bump it explicitly here.
        updatedAt: new Date(),
      },
    })
    .returning({
      id: vocabularyTerm.id,
      kind: vocabularyTerm.kind,
      normalizedText: vocabularyTerm.normalizedText,
    });

  for (const row of rows) {
    termIdByItemKey.set(analysisItemKey(row.kind, row.normalizedText), row.id);
  }

  return termIdByItemKey;
}

/** Two merged items can resolve to the same catalog term; fold them into one run row. */
function foldByTermId(items: AnalysisItemInsert[]) {
  const byTermId = new Map<string, AnalysisItemInsert>();

  for (const item of items) {
    const existing = byTermId.get(item.termId);

    if (!existing) {
      byTermId.set(item.termId, item);
      continue;
    }

    byTermId.set(item.termId, {
      ...existing,
      occurrenceCount: (existing.occurrenceCount ?? 0) + (item.occurrenceCount ?? 0),
      representativeContext: existing.representativeContext ?? item.representativeContext ?? null,
      contexts: normalizeContextList(
        [...(existing.contexts ?? []), ...(item.contexts ?? [])],
        MAX_CONTEXTS_PER_ANALYSIS_ITEM,
      ),
      frequencyRank: existing.frequencyRank ?? item.frequencyRank ?? null,
      cefrLevel: existing.cefrLevel ?? item.cefrLevel ?? null,
      cefrNumeric: existing.cefrNumeric ?? item.cefrNumeric ?? null,
      cefrNote: existing.cefrNote ?? item.cefrNote ?? null,
      isSelectable: true,
      filteredOutReason: null,
    });
  }

  return [...byTermId.values()];
}

/**
 * Replaces the run's analysis items, upserts the vocabulary catalog and marks the run
 * completed in a single batch.
 */
export async function persistAnalysisRunOutput(input: {
  runId: string;
  contentId: string;
  items: MergedAnalysisItem[];
  warnings: string[];
  summary: ContentAnalysisSummary;
}) {
  const completedAt = new Date();

  await db.delete(contentAnalysisItem).where(eq(contentAnalysisItem.analysisRunId, input.runId));

  const termIdByItemKey = await upsertVocabularyTerms(input.items);

  const analysisItems = foldByTermId(
    input.items.map((item) => {
      const termId = termIdByItemKey.get(analysisItemKey(item.kind, item.normalizedText));
      if (!termId) {
        throw new Error(`Missing term ID for ${item.kind}:${item.normalizedText}`);
      }

      return {
        id: crypto.randomUUID(),
        analysisRunId: input.runId,
        contentId: input.contentId,
        termId,
        analysisSource: item.analysisSource,
        surfaceForm: item.surfaceForm,
        representativeContext: item.representativeContext ?? null,
        contexts: item.contexts ?? null,
        occurrenceCount: item.occurrenceCount,
        frequencyRank: item.frequencyRank ?? null,
        cefrLevel: item.cefrLevel ?? null,
        cefrNumeric: item.cefrNumeric ?? null,
        cefrConfidence: null,
        cefrNote: item.notes ?? null,
        isSelectable: true,
        filteredOutReason: null,
        analyzedAt: completedAt,
      } satisfies AnalysisItemInsert;
    }),
  );

  const itemInserts: Array<BatchItem<"pg">> = [];
  for (let index = 0; index < analysisItems.length; index += ANALYSIS_ITEM_INSERT_CHUNK_SIZE) {
    itemInserts.push(
      db
        .insert(contentAnalysisItem)
        .values(analysisItems.slice(index, index + ANALYSIS_ITEM_INSERT_CHUNK_SIZE)),
    );
  }

  const finalize: Array<BatchItem<"pg">> = [
    db
      .update(contentAnalysisRun)
      .set({
        status: "completed",
        stage: "completed",
        progressMessage: COMPLETION_MESSAGE,
        summary: input.summary,
        warnings: input.warnings,
        errorCode: null,
        errorMessage: null,
        completedAt,
      })
      .where(eq(contentAnalysisRun.id, input.runId)),
    db.insert(contentAnalysisRunEvent).values({
      id: crypto.randomUUID(),
      runId: input.runId,
      stage: "completed",
      message: COMPLETION_MESSAGE,
      payload: {
        itemCount: input.items.length,
        warningCount: input.warnings.length,
      },
    }),
  ];

  await db.batch([...itemInserts, ...finalize] as [BatchItem<"pg">, ...Array<BatchItem<"pg">>]);
}
