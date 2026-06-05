import "server-only";

import { averageCefrLevel } from "@/lib/domain/cefr";
import type { StoredCefrLevel, StoredVocabularyKind } from "@/lib/domain/types";
import type { NlpAnalysisResponse } from "@/lib/integrations/nlp-service/client";
import type { ContentAnalysisSummary } from "@/lib/server/db/json-contracts";
import type { MergedAnalysisItem } from "@/lib/server/media-analysis/merge";

/**
 * Builds the stored run summary. Line and character counts come from the NLP service,
 * which owns subtitle normalization — the web app never parses subtitles itself.
 */
export function buildAnalysisSummary(input: {
  nlpResponse: NlpAnalysisResponse;
  items: MergedAnalysisItem[];
}): ContentAnalysisSummary {
  const kindCounts = input.items.reduce<Partial<Record<StoredVocabularyKind, number>>>(
    (counts, item) => {
      counts[item.kind] = (counts[item.kind] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const cefrDistribution = input.items.reduce<Partial<Record<StoredCefrLevel, number>>>(
    (distribution, item) => {
      if (item.cefrLevel) {
        distribution[item.cefrLevel] = (distribution[item.cefrLevel] ?? 0) + 1;
      }
      return distribution;
    },
    {},
  );
  const cefrNumerics = input.items
    .map((item) => item.cefrNumeric)
    .filter((value): value is number => typeof value === "number");

  return {
    uniqueLemmaCount: input.nlpResponse.metadata.unique_candidates,
    extractedItemCount: input.items.length,
    selectableItemCount: input.items.length,
    kindCounts,
    cefrDistribution,
    averageCefrLevel: averageCefrLevel(cefrNumerics),
    subtitleLineCount: input.nlpResponse.metadata.total_lines,
    subtitleCharacterCount: input.nlpResponse.metadata.total_characters,
  };
}
