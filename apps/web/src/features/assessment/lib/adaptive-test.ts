/**
 * The adaptive test loop: pick the most informative item, update the belief,
 * stop once the level is clear enough (or the item budget runs out).
 *
 * The server is stateless between requests; `AssessmentState` is persisted as
 * JSON on the attempt row and handed back to `applyAnswerToState`.
 *
 * Full derivation: lexiflix_explanatory_docs/assessment-algorithm-latex.
 */

import { ITEM_BANK } from "@/features/assessment/data/item-bank";
import type {
  ApplyAnswerOutcome,
  AssessmentItem,
  AssessmentState,
  CefrLevel,
  PosteriorSummary,
  PublicAssessmentItem,
} from "@/features/assessment/types";
import {
  ASSESSMENT_LIMITS,
  FAST_RESPONSE_EXTRA_ITEMS,
  FAST_RESPONSE_THRESHOLD_MS,
} from "@/lib/constants";
import { CEFR_LEVELS } from "@/lib/domain/cefr";
import {
  countBoundariesSpanned,
  createPriorPosterior,
  entropy,
  normalize,
  probabilityCorrect,
  summarizePosterior,
  THETA_GRID,
  updatePosterior,
} from "./ability-model";

export const SELECTION = {
  /** Sample from the best few items so the test is not identical for everyone. */
  shortlistSize: 3,
  maxConsecutiveSameLevel: 2,
} as const;

export const STOPPING_RULE = {
  /** Probability the winning level needs before stopping early. */
  minimumConfidence: 0.75,
  /** CEFR cuts the credible interval may still straddle: one tolerates a borderline. */
  maximumBoundariesSpanned: 1,
} as const;

/** Random source, injectable so tests can pin selection. */
export type RandomSource = () => number;

const ITEM_BY_ID = new Map(ITEM_BANK.map((item) => [item.id, item]));

/** Looks up a full item, including its answer key. */
export function getItemById(itemId: string): AssessmentItem | null {
  return ITEM_BY_ID.get(itemId) ?? null;
}

/** Strips the answer key so an item can be sent to the browser. */
export function toPublicItem(item: AssessmentItem): PublicAssessmentItem {
  const { correctIndex: _correctIndex, ...publicItem } = item;

  return publicItem;
}

/**
 * Expected entropy of the belief after asking `candidate`, averaged over both
 * outcomes. Selection minimises this.
 */
export function expectedPosteriorEntropy(posterior: readonly number[], candidate: AssessmentItem) {
  const likelihoods = THETA_GRID.map((theta) => probabilityCorrect(theta, candidate.difficulty));
  let pCorrect = 0;

  for (let index = 0; index < posterior.length; index += 1) {
    pCorrect += (posterior[index] ?? 0) * (likelihoods[index] ?? 0);
  }

  const ifCorrect = normalize(posterior.map((mass, index) => mass * (likelihoods[index] ?? 0)));
  const ifWrong = normalize(posterior.map((mass, index) => mass * (1 - (likelihoods[index] ?? 0))));

  return pCorrect * entropy(ifCorrect) + (1 - pCorrect) * entropy(ifWrong);
}

/** Opening item: closest to the middle of the scale, random among ties. */
export function selectFirstItem(random: RandomSource = Math.random): AssessmentItem {
  const closestDistance = Math.min(...ITEM_BANK.map((item) => Math.abs(item.difficulty)));
  const tied = ITEM_BANK.filter((item) => Math.abs(item.difficulty) === closestDistance);
  const picked = tied[Math.floor(random() * tied.length)] ?? tied[0];

  if (!picked) {
    throw new Error("Assessment item bank is empty.");
  }

  return picked;
}

/** Most informative unused item, or null when the bank is exhausted. */
export function selectNextItem(
  state: AssessmentState,
  random: RandomSource = Math.random,
): AssessmentItem | null {
  const candidates = getEligibleCandidates(state);

  if (candidates.length === 0) {
    return null;
  }

  return pickFromShortlist(
    candidates.map((item) => ({
      item,
      expectedEntropy: expectedPosteriorEntropy(state.posterior, item),
    })),
    random,
  );
}

/** Item-count floor for this attempt; very fast answering raises it. */
export function getMinimumItems(state: AssessmentState) {
  if (state.timedResponseCount <= 0) {
    return ASSESSMENT_LIMITS.minItems;
  }

  const averageResponseMs = state.totalResponseTimeMs / state.timedResponseCount;

  if (averageResponseMs >= FAST_RESPONSE_THRESHOLD_MS) {
    return ASSESSMENT_LIMITS.minItems;
  }

  return Math.min(
    ASSESSMENT_LIMITS.maxItems,
    ASSESSMENT_LIMITS.minItems + FAST_RESPONSE_EXTRA_ITEMS,
  );
}

/** Whether the attempt should finish instead of asking another item. */
export function shouldStopAssessment(state: AssessmentState, summary: PosteriorSummary) {
  if (state.answeredCount >= ASSESSMENT_LIMITS.maxItems) {
    return true;
  }

  if (
    state.answeredCount < getMinimumItems(state) ||
    summary.confidence < STOPPING_RULE.minimumConfidence
  ) {
    return false;
  }

  return (
    countBoundariesSpanned(summary.thetaLow, summary.thetaHigh) <=
    STOPPING_RULE.maximumBoundariesSpanned
  );
}

/** Starts an attempt: prior belief plus the opening question. */
export function initializeAssessmentState() {
  const firstItem = selectFirstItem();
  const state: AssessmentState = {
    posterior: createPriorPosterior(),
    usedItemIds: [firstItem.id],
    askedLevels: [firstItem.level],
    pendingItemId: firstItem.id,
    answeredCount: 0,
    totalResponseTimeMs: 0,
    timedResponseCount: 0,
  };

  return { state, firstItem };
}

/**
 * Validates state loaded from the attempt row. Shape, posterior length and
 * numeric mass are hard requirements; unknown levels and missing counters are
 * repaired so a bad row cannot strand a learner mid-attempt.
 */
export function parseAssessmentState(raw: unknown): AssessmentState {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid assessment state.");
  }

  const state = raw as Partial<AssessmentState>;

  if (
    !Array.isArray(state.posterior) ||
    !Array.isArray(state.usedItemIds) ||
    !Array.isArray(state.askedLevels)
  ) {
    throw new Error("Invalid assessment state shape.");
  }

  const posterior = state.posterior.map(Number);

  if (posterior.length !== THETA_GRID.length || posterior.some(Number.isNaN)) {
    throw new Error("Invalid posterior length.");
  }

  return {
    posterior: normalize(posterior),
    usedItemIds: state.usedItemIds.filter((value): value is string => typeof value === "string"),
    askedLevels: state.askedLevels.filter(isCefrLevel),
    pendingItemId: typeof state.pendingItemId === "string" ? state.pendingItemId : null,
    answeredCount: toCount(state.answeredCount),
    totalResponseTimeMs: toCount(state.totalResponseTimeMs),
    timedResponseCount: toCount(state.timedResponseCount),
  };
}

/**
 * Records one answer and returns the next question or the final result. A
 * "don't know" response arrives here as `isCorrect: false`.
 */
export function applyAnswerToState({
  state,
  item,
  isCorrect,
  responseTimeMs,
}: {
  state: AssessmentState;
  item: AssessmentItem;
  isCorrect: boolean;
  responseTimeMs: number | null;
}): ApplyAnswerOutcome {
  const answeredState: AssessmentState = {
    ...state,
    posterior: updatePosterior(state.posterior, { difficulty: item.difficulty, isCorrect }),
    pendingItemId: null,
    answeredCount: state.answeredCount + 1,
    totalResponseTimeMs: state.totalResponseTimeMs + (responseTimeMs ?? 0),
    timedResponseCount: state.timedResponseCount + (responseTimeMs === null ? 0 : 1),
  };

  const summary = summarizePosterior(answeredState.posterior);
  const limits = {
    minItems: getMinimumItems(answeredState),
    maxItems: ASSESSMENT_LIMITS.maxItems,
  };

  // An exhausted bank ends the attempt just like the stopping rule firing.
  const nextItem = shouldStopAssessment(answeredState, summary)
    ? null
    : selectNextItem(answeredState);

  if (!nextItem) {
    return {
      status: "completed",
      state: answeredState,
      result: { ...summary, answeredCount: answeredState.answeredCount },
      ...limits,
    };
  }

  return {
    status: "in_progress",
    state: {
      ...answeredState,
      pendingItemId: nextItem.id,
      usedItemIds: [...answeredState.usedItemIds, nextItem.id],
      askedLevels: [...answeredState.askedLevels, nextItem.level],
    },
    nextItem,
    summary,
    ...limits,
  };
}

/** Unused items, avoiding a third consecutive item from the same CEFR level. */
function getEligibleCandidates(state: AssessmentState) {
  const used = new Set(state.usedItemIds);
  const candidates = ITEM_BANK.filter((item) => !used.has(item.id));
  const recentLevels = state.askedLevels.slice(-SELECTION.maxConsecutiveSameLevel);
  const isOnARun =
    recentLevels.length === SELECTION.maxConsecutiveSameLevel && new Set(recentLevels).size === 1;

  if (!isOnARun) {
    return candidates;
  }

  const withoutRunLevel = candidates.filter((item) => item.level !== recentLevels[0]);

  return withoutRunLevel.length > 0 ? withoutRunLevel : candidates;
}

/** Draws from the best-scoring items with rank weights 3:2:1. */
function pickFromShortlist(
  scoredItems: { item: AssessmentItem; expectedEntropy: number }[],
  random: RandomSource,
): AssessmentItem | null {
  const shortlist = scoredItems
    .toSorted((left, right) => left.expectedEntropy - right.expectedEntropy)
    .slice(0, SELECTION.shortlistSize);

  if (shortlist.length <= 1) {
    return shortlist[0]?.item ?? null;
  }

  const weights = shortlist.map((_, index) => shortlist.length - index);
  let draw = random() * weights.reduce((sum, weight) => sum + weight, 0);

  for (let index = 0; index < shortlist.length; index += 1) {
    draw -= weights[index] ?? 0;

    if (draw <= 0) {
      return shortlist[index]?.item ?? null;
    }
  }

  return shortlist[shortlist.length - 1]?.item ?? null;
}

function isCefrLevel(value: unknown): value is CefrLevel {
  return CEFR_LEVELS.includes(value as CefrLevel);
}

function toCount(value: unknown) {
  return Number.isFinite(value) ? Number(value) : 0;
}
