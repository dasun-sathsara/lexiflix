/**
 * Spaced-repetition scheduling engine.
 *
 * An Anki-flavoured SM-2 variant. A card moves through three phases:
 *
 * 1. Learning — minute-scale steps repeated until the learner recalls it.
 * 2. Review   — day-scale intervals that grow by the card's ease factor.
 * 3. Mastered — recalled reliably enough (repetitions or interval length) to retire.
 *
 * A rating of `again` is a lapse: the card drops back to the first learning step.
 *
 * Everything in this module is pure and synchronous. Persistence lives in
 * `../server/review-service.ts`; all tuning values live in `SRS_CONFIG`.
 */

import type { PackCardState, PackReviewRating, PackSrsState } from "@/features/packs/types";
import { DAY_MS, MINUTE_MS, SRS_CONFIG } from "@/lib/constants";

/** Ratings that move a card forward. `again` is handled separately as a lapse. */
type RecallRating = Exclude<PackReviewRating, "again">;

/** The persisted SRS fields of a card plus the rating being applied to it. */
export type ComputeNextReviewStateInput = {
  rating: PackReviewRating;
  reviewedAt: Date;
  previousState: PackSrsState;
  previousRating?: PackReviewRating | null;
  repetitionCount: number;
  lapseCount: number;
  /** `null` while the card is still in the learning phase. */
  intervalDays: number | null;
  /** `null` for cards that have never been reviewed. */
  easeFactor: number | null;
};

/** The full set of SRS fields to persist after a review. */
export type NextReviewState = {
  state: PackSrsState;
  dueAt: Date;
  repetitionCount: number;
  lapseCount: number;
  intervalDays: number | null;
  easeFactor: number;
  masteredAt: Date | null;
};

/** Scheduling result of a single rating, before mastery is evaluated. */
type ScheduleOutcome = {
  dueAt: Date;
  intervalDays: number | null;
  easeFactor: number;
};

/**
 * Wait time for a `hard` rating on the first learning step: longer than a lapse,
 * shorter than a full step forward.
 */
const REPEAT_LEARNING_STEP_MS = Math.round(
  (SRS_CONFIG.firstLearningStepMs + SRS_CONFIG.secondLearningStepMs) / 2,
);

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function addMs(date: Date, ms: number) {
  return new Date(date.getTime() + ms);
}

function addDays(date: Date, days: number) {
  return addMs(date, days * DAY_MS);
}

/** Keeps the ease factor above the floor so intervals cannot collapse. */
function clampEaseFactor(value: number) {
  return Math.max(SRS_CONFIG.minimumEaseFactor, Number(value.toFixed(2)));
}

/** Keeps intervals a whole number of days within [1, maximumIntervalDays]. */
function clampIntervalDays(days: number) {
  return Math.min(SRS_CONFIG.maximumIntervalDays, Math.max(1, Math.round(days)));
}

/** Every successful review must push the due date at least one day further out. */
function growInterval(previousIntervalDays: number, targetDays: number) {
  return Math.max(previousIntervalDays + 1, clampIntervalDays(targetDays));
}

/**
 * A card has graduated once it left the `new` state and carries a day-scale
 * interval. Cards without an interval are still working through learning steps.
 */
function hasGraduated(input: ComputeNextReviewStateInput) {
  return input.previousState !== "new" && input.intervalDays !== null;
}

/**
 * Maps a persisted card state onto the states the scheduler understands.
 * `due` is a derived state and `removed` cards are never reviewed, so both
 * collapse onto `learning`.
 */
export function toPackSrsState(state: PackCardState): PackSrsState {
  if (state === "new" || state === "mastered") {
    return state;
  }

  return "learning";
}

/**
 * A card is mastered when the learner recalled it comfortably and it has either
 * been repeated enough times or reached a long enough interval to be retired.
 */
function isMastered({
  rating,
  repetitionCount,
  intervalDays,
}: {
  rating: PackReviewRating;
  repetitionCount: number;
  intervalDays: number | null;
}) {
  const recalledComfortably = rating === "good" || rating === "easy";

  return (
    recalledComfortably &&
    (repetitionCount >= SRS_CONFIG.masteryRepetitionThreshold ||
      (intervalDays ?? 0) >= SRS_CONFIG.masteryIntervalThresholdDays)
  );
}

// -----------------------------------------------------------------------------
// Scheduling phases
// -----------------------------------------------------------------------------

/**
 * Learning phase: minute-scale steps. `hard` repeats the current step, `good`
 * advances one step (graduating from the final step), and `easy` skips straight
 * to a graduated interval. The ease factor is left untouched while learning.
 */
function scheduleLearningStep({
  rating,
  reviewedAt,
  easeFactor,
  repetitionCount,
  previousRating,
}: {
  rating: RecallRating;
  reviewedAt: Date;
  easeFactor: number;
  repetitionCount: number;
  previousRating: PackReviewRating | null;
}): ScheduleOutcome {
  // A card reaches the final learning step once it has already been rated
  // `good`, so the next `good` rating graduates it onto day-scale intervals.
  const onFinalStep = repetitionCount > 0 && previousRating === "good";

  switch (rating) {
    case "hard":
      return {
        dueAt: addMs(
          reviewedAt,
          onFinalStep ? SRS_CONFIG.secondLearningStepMs : REPEAT_LEARNING_STEP_MS,
        ),
        intervalDays: null,
        easeFactor,
      };
    case "good":
      return onFinalStep
        ? {
            dueAt: addDays(reviewedAt, SRS_CONFIG.graduatingIntervalDays),
            intervalDays: SRS_CONFIG.graduatingIntervalDays,
            easeFactor,
          }
        : {
            dueAt: addMs(reviewedAt, SRS_CONFIG.secondLearningStepMs),
            intervalDays: null,
            easeFactor,
          };
    case "easy":
      return {
        dueAt: addDays(reviewedAt, SRS_CONFIG.easyIntervalDays),
        intervalDays: SRS_CONFIG.easyIntervalDays,
        easeFactor,
      };
  }
}

/**
 * Review phase: the interval grows from the previous one, scaled by the rating.
 * `hard` and `easy` also nudge the ease factor down and up respectively, which
 * changes how fast the card's future intervals grow.
 */
function scheduleReviewInterval({
  rating,
  reviewedAt,
  easeFactor,
  previousIntervalDays,
}: {
  rating: RecallRating;
  reviewedAt: Date;
  easeFactor: number;
  previousIntervalDays: number | null;
}): ScheduleOutcome {
  const previousInterval = Math.max(1, previousIntervalDays ?? 1);
  const schedule = (targetDays: number, nextEaseFactor: number): ScheduleOutcome => {
    const intervalDays = growInterval(previousInterval, targetDays);

    return { dueAt: addDays(reviewedAt, intervalDays), intervalDays, easeFactor: nextEaseFactor };
  };

  switch (rating) {
    case "hard":
      return schedule(
        previousInterval * SRS_CONFIG.hardIntervalMultiplier,
        clampEaseFactor(easeFactor - SRS_CONFIG.hardEasePenalty),
      );
    case "good":
      return schedule(previousInterval * easeFactor, easeFactor);
    case "easy":
      return schedule(
        previousInterval * easeFactor * SRS_CONFIG.easyBonus,
        clampEaseFactor(easeFactor + SRS_CONFIG.easyEaseBonus),
      );
  }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Computes the state, due date, and interval a card should have after being
 * rated. This is the single source of truth for SRS scheduling.
 */
export function computeNextReviewState(input: ComputeNextReviewStateInput): NextReviewState {
  const { rating, reviewedAt, repetitionCount, lapseCount } = input;
  const easeFactor = input.easeFactor ?? SRS_CONFIG.startingEaseFactor;
  const graduated = hasGraduated(input);

  // Lapse: the card returns to the first learning step and loses its interval.
  if (rating === "again") {
    return {
      state: "learning",
      dueAt: addMs(reviewedAt, SRS_CONFIG.firstLearningStepMs),
      // Only graduated cards are penalised; cards still learning keep their
      // progress so a single slip does not restart the whole sequence.
      repetitionCount: graduated ? 0 : repetitionCount,
      lapseCount: lapseCount + 1,
      intervalDays: null,
      easeFactor: graduated
        ? clampEaseFactor(easeFactor - SRS_CONFIG.lapseEasePenalty)
        : easeFactor,
      masteredAt: null,
    };
  }

  const nextRepetitionCount = repetitionCount + 1;
  const outcome = graduated
    ? scheduleReviewInterval({
        rating,
        reviewedAt,
        easeFactor,
        previousIntervalDays: input.intervalDays,
      })
    : scheduleLearningStep({
        rating,
        reviewedAt,
        easeFactor,
        repetitionCount,
        previousRating: input.previousRating ?? null,
      });
  const mastered = isMastered({
    rating,
    repetitionCount: nextRepetitionCount,
    intervalDays: outcome.intervalDays,
  });

  return {
    state: mastered ? "mastered" : "learning",
    dueAt: outcome.dueAt,
    repetitionCount: nextRepetitionCount,
    lapseCount,
    intervalDays: outcome.intervalDays,
    easeFactor: outcome.easeFactor,
    masteredAt: mastered ? reviewedAt : null,
  };
}

/**
 * Interval labels for every rating button, so the study UI can show what each
 * choice will cost before the learner commits to one.
 */
export function getRatingIntervalPreviews(
  input: Omit<ComputeNextReviewStateInput, "rating">,
): Record<PackReviewRating, string> {
  const preview = (rating: PackReviewRating) =>
    getNextReviewLabel(computeNextReviewState({ ...input, rating }).dueAt) ?? "";

  return {
    again: preview("again"),
    hard: preview("hard"),
    good: preview("good"),
    easy: preview("easy"),
  };
}

/**
 * Resolves the state a card should be displayed with right now. `due` is never
 * persisted: it is derived by comparing the scheduled due date against `now`.
 */
export function getEffectivePackCardState({
  state,
  dueAt,
  now,
  removedAt,
}: {
  state: PackCardState;
  dueAt: Date | null;
  now: Date;
  removedAt?: Date | null;
}): PackCardState {
  if (state === "removed" || removedAt) {
    return "removed";
  }

  // `new` and `mastered` cards sit outside the review schedule.
  if (state === "mastered" || state === "new") {
    return state;
  }

  return dueAt && dueAt.getTime() <= now.getTime() ? "due" : "learning";
}

/**
 * Formats a due date as a short relative label for the study UI
 * ("due now", "10m", "3h", "4d"), rounding up to the coarsest useful unit.
 */
export function getNextReviewLabel(dueAt: Date | string | null, now = new Date()) {
  if (!dueAt) {
    return null;
  }

  const diffMs = (typeof dueAt === "string" ? new Date(dueAt) : dueAt).getTime() - now.getTime();
  if (diffMs <= 0) {
    return "due now";
  }

  const minutes = Math.ceil(diffMs / MINUTE_MS);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.ceil(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.ceil(hours / 24)}d`;
}
