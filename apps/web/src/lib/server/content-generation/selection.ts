import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { MAX_CONTEXTS_PER_ANALYSIS_ITEM } from "@/lib/constants";
import { normalizeContextList } from "@/lib/domain/contexts";
import type {
  GenerationRequestSnapshot,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";
import {
  allowedLevels,
  knownTermPenalty,
  preferenceScore,
} from "@/lib/server/content-generation/selection-ranking";
import { db } from "@/lib/server/db";
import { contentAnalysisItem, userTermState, vocabularyTerm } from "@/lib/server/db/schema";

/** A candidate still carrying the fields used for ranking and lemma grouping. */
type RankedCandidate = SelectedGenerationItem & {
  lemmaKey: string;
  termState: "known" | "learning" | "ignored" | "unseen" | null;
};

export async function selectGenerationItems(input: {
  userId: string;
  contentId: string;
  analysisRunId: string;
  requestSnapshot: GenerationRequestSnapshot;
}): Promise<SelectedGenerationItem[]> {
  const rows = await db
    .select({
      analysisItemId: contentAnalysisItem.id,
      termId: contentAnalysisItem.termId,
      kind: vocabularyTerm.kind,
      displayText: vocabularyTerm.displayText,
      lemma: vocabularyTerm.lemma,
      normalizedText: vocabularyTerm.normalizedText,
      partOfSpeech: vocabularyTerm.partOfSpeech,
      cefrLevel: contentAnalysisItem.cefrLevel,
      occurrenceCount: contentAnalysisItem.occurrenceCount,
      frequencyRank: contentAnalysisItem.frequencyRank,
      representativeContext: contentAnalysisItem.representativeContext,
      contexts: contentAnalysisItem.contexts,
      termState: userTermState.state,
    })
    .from(contentAnalysisItem)
    .innerJoin(vocabularyTerm, eq(contentAnalysisItem.termId, vocabularyTerm.id))
    .leftJoin(
      userTermState,
      and(
        eq(userTermState.userId, input.userId),
        eq(userTermState.termId, contentAnalysisItem.termId),
      ),
    )
    .where(
      and(
        eq(contentAnalysisItem.contentId, input.contentId),
        eq(contentAnalysisItem.analysisRunId, input.analysisRunId),
        eq(contentAnalysisItem.isSelectable, true),
        inArray(vocabularyTerm.kind, input.requestSnapshot.selectedVocabularyTypes),
      ),
    );

  const levels = allowedLevels(
    input.requestSnapshot.learnerCefrLevel,
    input.requestSnapshot.cefrWindowMode,
  );

  const ranked = rows
    .filter((row) => !row.cefrLevel || levels.has(row.cefrLevel))
    .filter((row) => row.termState !== "ignored")
    .filter(
      (row) =>
        input.requestSnapshot.knownTermHandling !== "exclude_known" || row.termState !== "known",
    )
    .map<RankedCandidate>((row) => ({
      analysisItemId: row.analysisItemId,
      termId: row.termId,
      kind: row.kind,
      displayText: row.displayText,
      partsOfSpeech: row.partOfSpeech ? [row.partOfSpeech] : [],
      cefrLevel: row.cefrLevel,
      occurrenceCount: row.occurrenceCount,
      frequencyRank: row.frequencyRank,
      representativeContext: row.representativeContext,
      contexts: normalizeContextList(row.contexts),
      includedReason:
        row.termState === "known"
          ? `included despite ${row.termState} term handling`
          : "selected from reusable subtitle analysis",
      lemmaKey: `${row.kind}:${row.lemma ?? row.normalizedText}`,
      termState: row.termState,
    }))
    .sort((left, right) => {
      const scoreDelta =
        knownTermPenalty(left.termState, input.requestSnapshot.knownTermHandling) -
          knownTermPenalty(right.termState, input.requestSnapshot.knownTermHandling) ||
        preferenceScore(left, input.requestSnapshot.frequencyPreference) -
          preferenceScore(right, input.requestSnapshot.frequencyPreference);

      return scoreDelta !== 0 ? scoreDelta : left.displayText.localeCompare(right.displayText);
    });

  return collapseVariantsOfSameLemma(ranked).slice(0, input.requestSnapshot.packSize);
}

/**
 * Keeps one card per lemma: the best-ranked POS variant wins and absorbs the
 * other variants' parts of speech, occurrence counts and example sentences.
 */
function collapseVariantsOfSameLemma(ranked: RankedCandidate[]): SelectedGenerationItem[] {
  const bestByLemma = new Map<string, RankedCandidate>();

  for (const candidate of ranked) {
    const primary = bestByLemma.get(candidate.lemmaKey);

    if (!primary) {
      bestByLemma.set(candidate.lemmaKey, candidate);
      continue;
    }

    primary.occurrenceCount += candidate.occurrenceCount;
    primary.partsOfSpeech = [...new Set([...primary.partsOfSpeech, ...candidate.partsOfSpeech])];
    primary.contexts = normalizeContextList(
      [...primary.contexts, ...candidate.contexts],
      MAX_CONTEXTS_PER_ANALYSIS_ITEM,
    );
    primary.representativeContext ??= candidate.representativeContext;
  }

  return [...bestByLemma.values()].map(
    ({ lemmaKey: _lemmaKey, termState: _termState, ...item }) => item,
  );
}
