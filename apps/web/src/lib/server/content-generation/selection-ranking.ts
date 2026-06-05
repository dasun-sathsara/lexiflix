/**
 * Pure scoring and ranking logic for content-generation selection.
 *
 * Extracted from selection.ts so the CEFR-window, preference-scoring,
 * known-term-penalty and sort comparator can be tested without a DB.
 */

import { CEFR_LEVELS } from "@/lib/constants";
import type { StoredCefrLevel } from "@/lib/server/db/json-contracts";
import type { GenerationRequestSnapshot, SelectedGenerationItem } from "./contracts";

type UserTermStateValue = "known" | "learning" | "ignored" | "unseen" | null;

export const KNOWN_TERM_PENALTY = 1_000_000;
export const UNRANKED_FREQUENCY_RANK = 999_999;

/**
 * Returns the set of CEFR levels a candidate must belong to (or have null)
 * given the learner's current level and the configured window mode.
 */
export function allowedLevels(
  level: StoredCefrLevel | null,
  mode: GenerationRequestSnapshot["cefrWindowMode"],
): Set<StoredCefrLevel> {
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

  // all_levels_above
  return new Set<StoredCefrLevel>(CEFR_LEVELS.slice(index));
}

/**
 * Computes a numeric score for sorting candidates by frequency preference.
 * Lower scores sort first.
 */
export function preferenceScore(
  item: Pick<SelectedGenerationItem, "frequencyRank" | "cefrLevel" | "occurrenceCount">,
  frequencyPreference: GenerationRequestSnapshot["frequencyPreference"],
): number {
  const frequencyRank = item.frequencyRank ?? UNRANKED_FREQUENCY_RANK;

  if (frequencyPreference === "common_first") {
    return frequencyRank;
  }
  if (frequencyPreference === "challenge_first") {
    const cefrIndex = item.cefrLevel ? CEFR_LEVELS.indexOf(item.cefrLevel) : -1;
    return cefrIndex * -10_000 + frequencyRank;
  }

  // balanced
  return frequencyRank - item.occurrenceCount * 5;
}

/**
 * Returns a large penalty score for known terms when downrank_known handling
 * is active, pushing them to the end of the sorted list.
 */
export function knownTermPenalty(
  termState: UserTermStateValue,
  handling: GenerationRequestSnapshot["knownTermHandling"],
): number {
  if (handling !== "downrank_known") {
    return 0;
  }

  return termState === "known" ? KNOWN_TERM_PENALTY : 0;
}

/**
 * Comparator for sorting selected generation items by known-term penalty,
 * then preference score, then displayText alphabetically.
 */
export function selectionComparator(
  left: Pick<
    SelectedGenerationItem,
    "frequencyRank" | "cefrLevel" | "occurrenceCount" | "displayText"
  > & {
    termState: UserTermStateValue;
  },
  right: Pick<
    SelectedGenerationItem,
    "frequencyRank" | "cefrLevel" | "occurrenceCount" | "displayText"
  > & {
    termState: UserTermStateValue;
  },
  options: {
    knownTermHandling: GenerationRequestSnapshot["knownTermHandling"];
    frequencyPreference: GenerationRequestSnapshot["frequencyPreference"];
  },
): number {
  const scoreDelta =
    knownTermPenalty(left.termState, options.knownTermHandling) -
      knownTermPenalty(right.termState, options.knownTermHandling) ||
    preferenceScore(left, options.frequencyPreference) -
      preferenceScore(right, options.frequencyPreference);

  return scoreDelta !== 0 ? scoreDelta : left.displayText.localeCompare(right.displayText);
}
