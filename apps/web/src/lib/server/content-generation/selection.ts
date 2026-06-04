import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { CEFR_LEVELS } from "@/lib/constants";
import { normalizeContextList } from "@/lib/domain/contexts";
import type {
  GenerationRequestSnapshot,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";
import { db } from "@/lib/server/db";
import type { StoredCefrLevel } from "@/lib/server/db/json-contracts";
import { contentAnalysisItem, userTermState, vocabularyTerm } from "@/lib/server/db/schema";

type UserTermStateValue = "known" | "learning" | "ignored" | "unseen" | null;

const KNOWN_TERM_PENALTY = 1_000_000;
const UNRANKED_FREQUENCY_RANK = 999_999;

function allowedLevels(
  level: StoredCefrLevel | null,
  mode: GenerationRequestSnapshot["cefrWindowMode"],
) {
  if (!level) {
    return new Set<StoredCefrLevel>(CEFR_LEVELS);
  }

  const index = CEFR_LEVELS.indexOf(level);

  if (mode === "same_level") {
    return new Set<StoredCefrLevel>([level]);
  }
  if (mode === "one_level_above") {
    return new Set<StoredCefrLevel>(
      CEFR_LEVELS.slice(index, Math.min(index + 2, CEFR_LEVELS.length)),
    );
  }

  return new Set<StoredCefrLevel>(CEFR_LEVELS.slice(index));
}

function preferenceScore(
  item: SelectedGenerationItem,
  frequencyPreference: GenerationRequestSnapshot["frequencyPreference"],
) {
  const frequencyRank = item.frequencyRank ?? UNRANKED_FREQUENCY_RANK;

  if (frequencyPreference === "common_first") {
    return frequencyRank;
  }
  if (frequencyPreference === "challenge_first") {
    const cefrIndex = item.cefrLevel ? CEFR_LEVELS.indexOf(item.cefrLevel) : -1;
    return cefrIndex * -10_000 + frequencyRank;
  }

  return frequencyRank - item.occurrenceCount * 5;
}

function knownTermPenalty(
  termState: UserTermStateValue,
  handling: GenerationRequestSnapshot["knownTermHandling"],
) {
  if (handling !== "downrank_known") {
    return 0;
  }

  return termState === "known" ? KNOWN_TERM_PENALTY : 0;
}

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
      surfaceForm: contentAnalysisItem.surfaceForm,
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

  const candidates = rows
    .filter((row) => !row.cefrLevel || levels.has(row.cefrLevel))
    .filter((row) => row.termState !== "ignored")
    .filter(
      (row) =>
        input.requestSnapshot.knownTermHandling !== "exclude_known" || row.termState !== "known",
    )
    .map((row) => ({
      analysisItemId: row.analysisItemId,
      termId: row.termId,
      kind: row.kind,
      displayText: row.displayText,
      surfaceForm: row.surfaceForm,
      cefrLevel: row.cefrLevel,
      occurrenceCount: row.occurrenceCount,
      frequencyRank: row.frequencyRank,
      representativeContext: row.representativeContext,
      contexts: normalizeContextList(row.contexts),
      includedReason:
        row.termState === "known"
          ? `included despite ${row.termState} term handling`
          : "selected from reusable subtitle analysis",
      termState: row.termState,
    }))
    .sort((left, right) => {
      const scoreDelta =
        knownTermPenalty(left.termState, input.requestSnapshot.knownTermHandling) -
          knownTermPenalty(right.termState, input.requestSnapshot.knownTermHandling) ||
        preferenceScore(left, input.requestSnapshot.frequencyPreference) -
          preferenceScore(right, input.requestSnapshot.frequencyPreference);

      return scoreDelta !== 0 ? scoreDelta : left.displayText.localeCompare(right.displayText);
    })
    .map<SelectedGenerationItem>(({ termState: _termState, ...item }) => item);

  return candidates.slice(0, input.requestSnapshot.packSize);
}
