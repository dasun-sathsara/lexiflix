import "server-only";

import { MAX_CONTEXTS_PER_ANALYSIS_ITEM } from "@/lib/constants";
import { cefrNumericFromLevel } from "@/lib/domain/cefr";
import { normalizeContextList } from "@/lib/domain/contexts";
import type { NlpAnalysisResponse } from "@/lib/integrations/nlp-service/client";
import type {
  NlpCandidateContext,
  StoredCefrLevel,
  StoredVocabularyKind,
} from "@/lib/server/db/json-contracts";
import type { AnalysisLlmPhrase } from "@/lib/server/media-analysis/providers/analysis-llm";
import { analysisItemKey, normalizeTermText } from "@/lib/server/media-analysis/terms";

export type MergedAnalysisItem = {
  kind: StoredVocabularyKind;
  normalizedText: string;
  lemma: string | null;
  displayText: string;
  partOfSpeech: string | null;
  /** Term-catalog CEFR (same value as run-item CEFR for current pipelines). */
  cefrLevel: StoredCefrLevel | null;
  cefrNumeric: number | null;
  notes: string | null;
  analysisSource: "nlp" | "analysis_llm";
  surfaceForm: string;
  representativeContext: string | null;
  contexts: NlpCandidateContext[];
  occurrenceCount: number;
  frequencyRank: number | null;
};

function cappedContexts(contexts: unknown[]) {
  return normalizeContextList(contexts, MAX_CONTEXTS_PER_ANALYSIS_ITEM);
}

function toNlpItems(response: NlpAnalysisResponse): MergedAnalysisItem[] {
  const items: MergedAnalysisItem[] = [];

  for (const candidate of response.candidates) {
    const normalizedText = normalizeTermText(candidate.lemma || candidate.text);
    if (!normalizedText) {
      continue;
    }

    const contexts = cappedContexts(candidate.contexts);
    const cefrLevel = candidate.cefr_level ?? null;

    items.push({
      kind: "word",
      normalizedText,
      lemma: normalizeTermText(candidate.lemma) || candidate.lemma,
      displayText: candidate.lemma || candidate.text,
      partOfSpeech: candidate.type,
      cefrLevel,
      cefrNumeric: cefrNumericFromLevel(cefrLevel),
      notes: null,
      analysisSource: "nlp",
      surfaceForm: candidate.text,
      representativeContext: contexts[0] ?? null,
      contexts,
      occurrenceCount: candidate.count,
      frequencyRank: null,
    });
  }

  return items;
}

function toLlmItems(phrases: AnalysisLlmPhrase[]): MergedAnalysisItem[] {
  const items: MergedAnalysisItem[] = [];

  for (const phrase of phrases) {
    const normalizedText = normalizeTermText(phrase.text);
    if (!normalizedText) {
      continue;
    }

    const contexts = cappedContexts(phrase.contexts);
    const cefrLevel = phrase.cefrLevel ?? null;

    items.push({
      kind: phrase.kind,
      normalizedText,
      lemma: normalizedText,
      displayText: phrase.displayText,
      partOfSpeech: null,
      cefrLevel,
      cefrNumeric: phrase.cefrNumeric ?? cefrNumericFromLevel(cefrLevel),
      notes: phrase.rationale ?? null,
      analysisSource: "analysis_llm",
      surfaceForm: phrase.displayText,
      representativeContext: phrase.representativeContext ?? contexts[0] ?? null,
      contexts,
      occurrenceCount: 1,
      frequencyRank: null,
    });
  }

  return items;
}

function absorb(target: MergedAnalysisItem, incoming: MergedAnalysisItem) {
  target.occurrenceCount += incoming.occurrenceCount;
  target.contexts = cappedContexts([...target.contexts, ...incoming.contexts]);
  target.representativeContext ??= incoming.representativeContext;
  target.cefrLevel ??= incoming.cefrLevel;
  target.cefrNumeric ??= incoming.cefrNumeric;
  target.notes ??= incoming.notes;
}

/**
 * Combines NLP word candidates with LLM phrase candidates into one ranked item list.
 * Items are keyed by kind and normalized text, and ranked by occurrence count.
 */
export function mergeAnalysisItems(input: {
  nlpResponse: NlpAnalysisResponse;
  phrases: AnalysisLlmPhrase[];
}): MergedAnalysisItem[] {
  const byKey = new Map<string, MergedAnalysisItem>();

  for (const item of [...toNlpItems(input.nlpResponse), ...toLlmItems(input.phrases)]) {
    const key = analysisItemKey(item.kind, item.normalizedText);
    const existing = byKey.get(key);

    if (existing) {
      absorb(existing, item);
      continue;
    }

    byKey.set(key, { ...item });
  }

  const items = [...byKey.values()].sort((left, right) => {
    if (left.occurrenceCount !== right.occurrenceCount) {
      return right.occurrenceCount - left.occurrenceCount;
    }
    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }
    return left.normalizedText.localeCompare(right.normalizedText);
  });

  for (const [index, item] of items.entries()) {
    item.frequencyRank = index + 1;
  }

  return items;
}
