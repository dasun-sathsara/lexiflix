/**
 * Ability model for the CEFR placement test.
 *
 * Ability (theta) and item difficulty share one scale from -3 to +3. Belief
 * about a learner's ability is a probability distribution over `THETA_GRID`,
 * updated with Bayes' rule after each answer.
 *
 * Full derivation: lexiflix_explanatory_docs/assessment-algorithm-latex.
 */

import type { CefrLevel, LevelProbabilities, PosteriorSummary } from "@/features/assessment/types";
import { CEFR_LEVELS } from "@/lib/domain/cefr";

export const ABILITY_SCALE = { min: -3, max: 3, step: 0.05 } as const;

/** 3PL response model with fixed discrimination (a) and guessing floor (c). */
export const RESPONSE_MODEL = {
  discrimination: 1.2,
  /** Four options per item, so luck alone succeeds about a quarter of the time. */
  guessing: 0.25,
} as const;

/** Starting belief: standard normal, i.e. "probably average, possibly anything". */
export const PRIOR = { mean: 0, standardDeviation: 1 } as const;

/** Quantiles reported as the 95% credible interval for theta. */
export const CREDIBLE_INTERVAL = { lower: 0.025, upper: 0.975 } as const;

/** A result is called borderline when the winner is weak and the runner-up is adjacent. */
export const BORDERLINE_THRESHOLDS = { confidentEnough: 0.6, decisiveLead: 0.15 } as const;

/** CEFR bands as cut points on the theta scale, lowest first. */
const CEFR_BANDS = [
  { level: "A1", upperBound: -1.5 },
  { level: "A2", upperBound: -0.75 },
  { level: "B1", upperBound: 0 },
  { level: "B2", upperBound: 0.75 },
  { level: "C1", upperBound: 1.5 },
  { level: "C2", upperBound: Number.POSITIVE_INFINITY },
] as const satisfies readonly { level: CefrLevel; upperBound: number }[];

/** The five interior cuts separating the six bands. */
export const CEFR_BAND_BOUNDARIES: readonly number[] = CEFR_BANDS.map(
  (band) => band.upperBound,
).filter(Number.isFinite);

/** Candidate ability values. Every distribution here is aligned to this grid. */
export const THETA_GRID: readonly number[] = buildThetaGrid();

function buildThetaGrid() {
  const points: number[] = [];

  // EPSILON keeps float drift from dropping the final point.
  for (
    let value = ABILITY_SCALE.min;
    value <= ABILITY_SCALE.max + Number.EPSILON;
    value += ABILITY_SCALE.step
  ) {
    points.push(Number(value.toFixed(2)));
  }

  return points;
}

/** The CEFR band an ability value falls into. */
export function levelForTheta(theta: number): CefrLevel {
  return CEFR_BANDS.find((band) => theta < band.upperBound)?.level ?? "C2";
}

/** How many CEFR cuts a theta interval straddles; 0 means one unambiguous band. */
export function countBoundariesSpanned(low: number, high: number) {
  return CEFR_BAND_BOUNDARIES.filter((boundary) => low < boundary && high > boundary).length;
}

/** P(correct | theta, difficulty): guessing floor plus a logistic rise. */
export function probabilityCorrect(theta: number, difficulty: number) {
  const { discrimination, guessing } = RESPONSE_MODEL;
  const sigmoid = 1 / (1 + Math.exp(-discrimination * (theta - difficulty)));

  return guessing + (1 - guessing) * sigmoid;
}

/** Rescales weights to sum to 1; degenerate input falls back to uniform. */
export function normalize(weights: readonly number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  if (total <= 0 || Number.isNaN(total)) {
    return weights.map(() => 1 / weights.length);
  }

  return weights.map((weight) => weight / total);
}

/** Shannon entropy in nats: how much uncertainty a distribution still holds. */
export function entropy(distribution: readonly number[]) {
  let total = 0;

  for (const probability of distribution) {
    if (probability > 0) {
      total -= probability * Math.log(probability);
    }
  }

  return total;
}

/** The prior belief over `THETA_GRID`. */
export function createPriorPosterior() {
  return normalize(
    THETA_GRID.map((theta) => normalPdf(theta, PRIOR.mean, PRIOR.standardDeviation)),
  );
}

/** Bayes update for one answer: posterior ∝ prior × P(answer | theta). */
export function updatePosterior(
  posterior: readonly number[],
  { difficulty, isCorrect }: { difficulty: number; isCorrect: boolean },
): number[] {
  return normalize(
    posterior.map((mass, index) => {
      const pCorrect = probabilityCorrect(THETA_GRID[index] ?? 0, difficulty);

      return mass * (isCorrect ? pCorrect : 1 - pCorrect);
    }),
  );
}

/** Condenses a belief into a point estimate, interval, and CEFR verdict. */
export function summarizePosterior(posterior: readonly number[]): PosteriorSummary {
  const normalized = normalize(posterior);
  const levelProbabilities = getLevelProbabilities(normalized);
  const [best, runnerUp] = rankLevels(levelProbabilities);
  const bestLevel = best?.level ?? "B1";
  const confidence = best?.probability ?? 0;

  return {
    thetaMean: expectedValue(normalized),
    thetaLow: quantile(normalized, CREDIBLE_INTERVAL.lower),
    thetaHigh: quantile(normalized, CREDIBLE_INTERVAL.upper),
    levelProbabilities,
    bestLevel,
    confidence,
    borderlineLabel: getBorderlineLabel({ bestLevel, confidence, runnerUp }),
  };
}

function normalPdf(x: number, mean: number, standardDeviation: number) {
  const z = (x - mean) / standardDeviation;

  return Math.exp(-0.5 * z * z) / (standardDeviation * Math.sqrt(2 * Math.PI));
}

/** Probability-weighted mean of theta. */
function expectedValue(distribution: readonly number[]) {
  return THETA_GRID.reduce((mean, theta, index) => mean + theta * (distribution[index] ?? 0), 0);
}

/** Lowest theta whose cumulative probability reaches `probability`. */
function quantile(distribution: readonly number[], probability: number) {
  const highestTheta = THETA_GRID[THETA_GRID.length - 1] ?? 0;
  let cumulative = 0;

  for (let index = 0; index < distribution.length; index += 1) {
    cumulative += distribution[index] ?? 0;

    if (cumulative >= probability) {
      return THETA_GRID[index] ?? highestTheta;
    }
  }

  return highestTheta;
}

/** Sums probability mass inside each CEFR band, turning theta into levels. */
function getLevelProbabilities(distribution: readonly number[]): LevelProbabilities {
  const probabilities: LevelProbabilities = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };

  for (let index = 0; index < THETA_GRID.length; index += 1) {
    probabilities[levelForTheta(THETA_GRID[index] ?? 0)] += distribution[index] ?? 0;
  }

  return probabilities;
}

function rankLevels(probabilities: LevelProbabilities) {
  return CEFR_LEVELS.map((level) => ({ level, probability: probabilities[level] })).toSorted(
    (left, right) => right.probability - left.probability,
  );
}

function getBorderlineLabel({
  bestLevel,
  confidence,
  runnerUp,
}: {
  bestLevel: CefrLevel;
  confidence: number;
  runnerUp?: { level: CefrLevel; probability: number };
}) {
  if (!runnerUp || confidence >= BORDERLINE_THRESHOLDS.confidentEnough) {
    return null;
  }

  const levelsApart = Math.abs(
    CEFR_LEVELS.indexOf(bestLevel) - CEFR_LEVELS.indexOf(runnerUp.level),
  );
  const isCloseCall = confidence - runnerUp.probability <= BORDERLINE_THRESHOLDS.decisiveLead;

  return levelsApart === 1 && isCloseCall ? `${bestLevel} (borderline ${runnerUp.level})` : null;
}
