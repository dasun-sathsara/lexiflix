import { ITEM_BANK } from "@/features/assessment/data/item-bank";
import type {
  AssessmentItem,
  AssessmentResult,
  AssessmentState,
  CefrLevel,
  PosteriorSummary,
  PublicAssessmentItem,
} from "@/features/assessment/lib/types";

const MODEL_A = 1.2;
const MODEL_C = 0.25;
const THETA_MIN = -3;
const THETA_MAX = 3;
const THETA_STEP = 0.05;
const PRIOR_MEAN = 0;
const PRIOR_SD = 1;

export const ASSESSMENT_LIMITS = {
  minItems: 8,
  maxItems: 12,
} as const;

const FAST_RESPONSE_THRESHOLD_MS = 600;
const FAST_RESPONSE_EXTRA_ITEMS = 2;

const CEFR_BAND_CUTS = {
  A1: { low: Number.NEGATIVE_INFINITY, high: -1.5 },
  A2: { low: -1.5, high: -0.75 },
  B1: { low: -0.75, high: 0 },
  B2: { low: 0, high: 0.75 },
  C1: { low: 0.75, high: 1.5 },
  C2: { low: 1.5, high: Number.POSITIVE_INFINITY },
} satisfies Record<CefrLevel, { low: number; high: number }>;

const THETA_BOUNDARIES = [-1.5, -0.75, 0, 0.75, 1.5] as const;

const ITEM_BY_ID = new Map(ITEM_BANK.map((item) => [item.id, item]));

export const THETA_GRID = buildThetaGrid();

function buildThetaGrid() {
  const points: number[] = [];
  for (let value = THETA_MIN; value <= THETA_MAX + Number.EPSILON; value += THETA_STEP) {
    points.push(Number(value.toFixed(2)));
  }
  return points;
}

function normalPdf(x: number, mean: number, sd: number) {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

function normalize(distribution: number[]) {
  const sum = distribution.reduce((acc, value) => acc + value, 0);
  if (sum <= 0 || Number.isNaN(sum)) {
    const uniformValue = 1 / distribution.length;
    return distribution.map(() => uniformValue);
  }

  return distribution.map((value) => value / sum);
}

function entropy(distribution: number[]) {
  let total = 0;
  for (const probability of distribution) {
    if (probability > 0) {
      total -= probability * Math.log(probability);
    }
  }
  return total;
}

function probabilityCorrect(theta: number, difficulty: number) {
  return MODEL_C + (1 - MODEL_C) / (1 + Math.exp(-MODEL_A * (theta - difficulty)));
}

function quantile(distribution: number[], q: number) {
  let cumulative = 0;

  for (let index = 0; index < distribution.length; index += 1) {
    cumulative += distribution[index] ?? 0;
    if (cumulative >= q) {
      return THETA_GRID[index] ?? THETA_GRID[THETA_GRID.length - 1] ?? 0;
    }
  }

  return THETA_GRID[THETA_GRID.length - 1] ?? 0;
}

function getLevelProbabilities(distribution: number[]) {
  const probabilities: Record<CefrLevel, number> = {
    A1: 0,
    A2: 0,
    B1: 0,
    B2: 0,
    C1: 0,
    C2: 0,
  };

  for (let index = 0; index < THETA_GRID.length; index += 1) {
    const theta = THETA_GRID[index] ?? 0;
    const mass = distribution[index] ?? 0;

    if (theta < CEFR_BAND_CUTS.A1.high) {
      probabilities.A1 += mass;
    } else if (theta < CEFR_BAND_CUTS.A2.high) {
      probabilities.A2 += mass;
    } else if (theta < CEFR_BAND_CUTS.B1.high) {
      probabilities.B1 += mass;
    } else if (theta < CEFR_BAND_CUTS.B2.high) {
      probabilities.B2 += mass;
    } else if (theta < CEFR_BAND_CUTS.C1.high) {
      probabilities.C1 += mass;
    } else {
      probabilities.C2 += mass;
    }
  }

  return probabilities;
}

function getTopLevels(probabilities: Record<CefrLevel, number>) {
  return Object.entries(probabilities)
    .map(([level, probability]) => ({
      level: level as CefrLevel,
      probability,
    }))
    .sort((left, right) => right.probability - left.probability);
}

function getBorderlineLabel(
  topLevel: CefrLevel,
  topProbability: number,
  runnerUp?: {
    level: CefrLevel;
    probability: number;
  },
) {
  if (!runnerUp || topProbability >= 0.6) {
    return null;
  }

  const orderedLevels: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const topIndex = orderedLevels.indexOf(topLevel);
  const runnerIndex = orderedLevels.indexOf(runnerUp.level);
  const adjacent = Math.abs(topIndex - runnerIndex) === 1;

  if (!adjacent) {
    return null;
  }

  if (topProbability - runnerUp.probability > 0.15) {
    return null;
  }

  return `${topLevel} (borderline ${runnerUp.level})`;
}

function countCrossedBoundaries(low: number, high: number) {
  return THETA_BOUNDARIES.filter((boundary) => low < boundary && high > boundary).length;
}

function expectedEntropyAfterItem(distribution: number[], candidate: AssessmentItem) {
  const likelihoods = THETA_GRID.map((theta) => probabilityCorrect(theta, candidate.difficulty));

  let pCorrect = 0;
  for (let index = 0; index < distribution.length; index += 1) {
    pCorrect += (distribution[index] ?? 0) * (likelihoods[index] ?? 0);
  }

  const posteriorCorrect = normalize(
    distribution.map((mass, index) => mass * (likelihoods[index] ?? 0)),
  );
  const posteriorWrong = normalize(
    distribution.map((mass, index) => mass * (1 - (likelihoods[index] ?? 0))),
  );

  return pCorrect * entropy(posteriorCorrect) + (1 - pCorrect) * entropy(posteriorWrong);
}

function chooseWithExposureControl(
  scoredItems: Array<{ item: AssessmentItem; expectedEntropy: number }>,
) {
  const sorted = [...scoredItems].sort(
    (left, right) => left.expectedEntropy - right.expectedEntropy,
  );
  const topCandidates = sorted.slice(0, 3);

  if (topCandidates.length === 0) {
    return null;
  }

  if (topCandidates.length === 1) {
    return topCandidates[0]?.item ?? null;
  }

  const weights = topCandidates.map((_, index) => topCandidates.length - index);
  const totalWeight = weights.reduce((acc, value) => acc + value, 0);
  let draw = Math.random() * totalWeight;

  for (let index = 0; index < topCandidates.length; index += 1) {
    draw -= weights[index] ?? 0;
    if (draw <= 0) {
      return topCandidates[index]?.item ?? null;
    }
  }

  return topCandidates[topCandidates.length - 1]?.item ?? null;
}

function selectInitialItem() {
  const sortedByDistance = [...ITEM_BANK].sort(
    (left, right) => Math.abs(left.difficulty) - Math.abs(right.difficulty),
  );

  const closestDistance = Math.abs((sortedByDistance[0]?.difficulty ?? 0) - 0);
  const closestItems = sortedByDistance.filter(
    (item) => Math.abs(item.difficulty - 0) === closestDistance,
  );

  const picked =
    closestItems[Math.floor(Math.random() * closestItems.length)] ?? sortedByDistance[0];

  if (!picked) {
    throw new Error("Assessment item bank is empty.");
  }

  return picked;
}

function selectNextItem(state: AssessmentState) {
  const used = new Set(state.usedItemIds);
  let candidates = ITEM_BANK.filter((item) => !used.has(item.id));

  if (candidates.length === 0) {
    return null;
  }

  const lastLevel = state.askedLevels[state.askedLevels.length - 1];
  const secondLastLevel = state.askedLevels[state.askedLevels.length - 2];

  if (lastLevel && secondLastLevel && lastLevel === secondLastLevel) {
    const filtered = candidates.filter((item) => item.level !== lastLevel);
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }

  const scored = candidates.map((item) => ({
    item,
    expectedEntropy: expectedEntropyAfterItem(state.posterior, item),
  }));

  return chooseWithExposureControl(scored);
}

export function createPriorPosterior() {
  const unnormalized = THETA_GRID.map((theta) => normalPdf(theta, PRIOR_MEAN, PRIOR_SD));
  return normalize(unnormalized);
}

export function summarizePosterior(posterior: number[]): PosteriorSummary {
  const normalized = normalize(posterior);

  let thetaMean = 0;
  for (let index = 0; index < THETA_GRID.length; index += 1) {
    thetaMean += (THETA_GRID[index] ?? 0) * (normalized[index] ?? 0);
  }

  const thetaLow = quantile(normalized, 0.025);
  const thetaHigh = quantile(normalized, 0.975);
  const levelProbabilities = getLevelProbabilities(normalized);
  const [best, runnerUp] = getTopLevels(levelProbabilities);

  const bestLevel = best?.level ?? "B1";
  const confidence = best?.probability ?? 0;

  return {
    thetaMean,
    thetaLow,
    thetaHigh,
    levelProbabilities,
    bestLevel,
    confidence,
    borderlineLabel: getBorderlineLabel(bestLevel, confidence, runnerUp),
  };
}

export function getItemById(itemId: string) {
  return ITEM_BY_ID.get(itemId) ?? null;
}

export function toPublicItem(item: AssessmentItem): PublicAssessmentItem {
  const { correctIndex: _correctIndex, ...publicItem } = item;
  return publicItem;
}

export function initializeAssessmentState() {
  const firstItem = selectInitialItem();
  const state: AssessmentState = {
    posterior: createPriorPosterior(),
    usedItemIds: [firstItem.id],
    askedLevels: [firstItem.level],
    pendingItemId: firstItem.id,
    answeredCount: 0,
    totalResponseTimeMs: 0,
    timedResponseCount: 0,
  };

  return {
    state,
    firstItem,
  };
}

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

  const posterior = state.posterior.map((value) => Number(value));

  if (posterior.length !== THETA_GRID.length || posterior.some((value) => Number.isNaN(value))) {
    throw new Error("Invalid posterior length.");
  }

  return {
    posterior: normalize(posterior),
    usedItemIds: state.usedItemIds.filter((value): value is string => typeof value === "string"),
    askedLevels: state.askedLevels.filter(
      (value): value is CefrLevel =>
        value === "A1" ||
        value === "A2" ||
        value === "B1" ||
        value === "B2" ||
        value === "C1" ||
        value === "C2",
    ),
    pendingItemId: typeof state.pendingItemId === "string" ? state.pendingItemId : null,
    answeredCount: Number.isFinite(state.answeredCount) ? Number(state.answeredCount) : 0,
    totalResponseTimeMs: Number.isFinite(state.totalResponseTimeMs)
      ? Number(state.totalResponseTimeMs)
      : 0,
    timedResponseCount: Number.isFinite(state.timedResponseCount)
      ? Number(state.timedResponseCount)
      : 0,
  };
}

function getMinimumItems(state: AssessmentState) {
  if (!state.timedResponseCount) {
    return ASSESSMENT_LIMITS.minItems;
  }

  const averageResponseMs = state.totalResponseTimeMs / Math.max(1, state.timedResponseCount);
  if (averageResponseMs < FAST_RESPONSE_THRESHOLD_MS) {
    return Math.min(
      ASSESSMENT_LIMITS.maxItems,
      ASSESSMENT_LIMITS.minItems + FAST_RESPONSE_EXTRA_ITEMS,
    );
  }

  return ASSESSMENT_LIMITS.minItems;
}

function shouldStopAssessment(state: AssessmentState, summary: PosteriorSummary) {
  if (state.answeredCount >= ASSESSMENT_LIMITS.maxItems) {
    return true;
  }

  if (state.answeredCount < getMinimumItems(state)) {
    return false;
  }

  if (summary.confidence < 0.75) {
    return false;
  }

  return countCrossedBoundaries(summary.thetaLow, summary.thetaHigh) <= 1;
}

function updatePosterior(
  posterior: number[],
  itemDifficulty: number,
  isCorrect: boolean,
): number[] {
  const next = posterior.map((mass, index) => {
    const pCorrect = probabilityCorrect(THETA_GRID[index] ?? 0, itemDifficulty);
    return mass * (isCorrect ? pCorrect : 1 - pCorrect);
  });

  return normalize(next);
}

export function applyAnswerToState(input: {
  state: AssessmentState;
  item: AssessmentItem;
  isCorrect: boolean;
  responseTimeMs: number | null;
}):
  | {
      status: "in_progress";
      state: AssessmentState;
      nextItem: AssessmentItem;
      summary: PosteriorSummary;
      minItems: number;
      maxItems: number;
    }
  | {
      status: "completed";
      state: AssessmentState;
      result: AssessmentResult;
      minItems: number;
      maxItems: number;
    } {
  const nextPosterior = updatePosterior(
    input.state.posterior,
    input.item.difficulty,
    input.isCorrect,
  );

  const totalResponseTimeMs =
    input.responseTimeMs !== null
      ? input.state.totalResponseTimeMs + input.responseTimeMs
      : input.state.totalResponseTimeMs;

  const timedResponseCount =
    input.responseTimeMs !== null
      ? input.state.timedResponseCount + 1
      : input.state.timedResponseCount;

  const baseState: AssessmentState = {
    ...input.state,
    posterior: nextPosterior,
    pendingItemId: null,
    answeredCount: input.state.answeredCount + 1,
    totalResponseTimeMs,
    timedResponseCount,
  };

  const summary = summarizePosterior(nextPosterior);
  const minItems = getMinimumItems(baseState);
  const maxItems = ASSESSMENT_LIMITS.maxItems;

  if (shouldStopAssessment(baseState, summary)) {
    return {
      status: "completed",
      state: baseState,
      minItems,
      maxItems,
      result: {
        ...summary,
        answeredCount: baseState.answeredCount,
      },
    };
  }

  const nextItem = selectNextItem(baseState);

  if (!nextItem) {
    return {
      status: "completed",
      state: baseState,
      minItems,
      maxItems,
      result: {
        ...summary,
        answeredCount: baseState.answeredCount,
      },
    };
  }

  const nextState: AssessmentState = {
    ...baseState,
    pendingItemId: nextItem.id,
    usedItemIds: [...baseState.usedItemIds, nextItem.id],
    askedLevels: [...baseState.askedLevels, nextItem.level],
  };

  return {
    status: "in_progress",
    state: nextState,
    nextItem,
    summary,
    minItems,
    maxItems,
  };
}
