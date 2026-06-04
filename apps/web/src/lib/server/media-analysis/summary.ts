import "server-only";

import { averageCefrLevel } from "@/lib/domain/cefr";
import type { NlpVocabularyCandidate } from "@/lib/integrations/nlp-service/client";
import type {
  ContentAnalysisSummary,
  StoredCefrLevel,
  StoredVocabularyKind,
} from "@/lib/server/db/json-contracts";
import type { MergedAnalysisItem } from "@/lib/server/media-analysis/merge";
import { buildPlainTextCorpus } from "@/lib/server/media-analysis/subtitles/parse";
import type { SubtitleLine } from "@/lib/server/media-analysis/subtitles/types";
import { normalizeTermText } from "@/lib/server/media-analysis/terms";

function countWords(lines: SubtitleLine[]) {
  return buildPlainTextCorpus(lines)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean).length;
}

function countUniqueLemmas(candidates: NlpVocabularyCandidate[]) {
  return new Set(
    candidates
      .map((candidate) => normalizeTermText(candidate.lemma || candidate.text))
      .filter(Boolean),
  ).size;
}

export function buildAnalysisSummary(input: {
  lines: SubtitleLine[];
  nlpCandidates: NlpVocabularyCandidate[];
  items: MergedAnalysisItem[];
}): ContentAnalysisSummary {
  const totalWordCount = countWords(input.lines);
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
  const totalDurationSeconds =
    input.lines.length > 0
      ? input.lines[input.lines.length - 1].endSeconds - input.lines[0].startSeconds
      : 0;

  return {
    totalWordCount,
    uniqueLemmaCount: countUniqueLemmas(input.nlpCandidates),
    extractedItemCount: input.items.length,
    selectableItemCount: input.items.length,
    kindCounts,
    cefrDistribution,
    averageCefrLevel: averageCefrLevel(cefrNumerics),
    speechRateWpm:
      totalDurationSeconds > 0 ? Math.round((totalWordCount / totalDurationSeconds) * 60) : null,
    subtitleLineCount: input.lines.length,
  };
}
