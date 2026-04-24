import type { PackCardState, PackReviewRating } from "@/features/packs/types";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const SRS = {
  firstLearningStepMs: MINUTE_MS,
  secondLearningStepMs: 10 * MINUTE_MS,
  graduatingIntervalDays: 1,
  easyIntervalDays: 4,
  startingEaseFactor: 2.5,
  minimumEaseFactor: 1.3,
  hardIntervalMultiplier: 1.2,
  easyBonus: 1.3,
  maximumIntervalDays: 36_500,
  masteryRepetitionThreshold: 5,
  masteryIntervalThresholdDays: 21,
} as const;

export type SrsLifecycleState = Exclude<PackCardState, "due" | "removed">;

export type ComputeNextReviewStateInput = {
  rating: PackReviewRating;
  reviewedAt: Date;
  previousState: SrsLifecycleState;
  previousRating?: PackReviewRating | null;
  repetitionCount: number;
  lapseCount: number;
  intervalDays: number | null;
  easeFactor: number | null;
};

export type NextReviewState = {
  state: SrsLifecycleState;
  dueAt: Date;
  repetitionCount: number;
  lapseCount: number;
  intervalDays: number | null;
  easeFactor: number;
  masteredAt: Date | null;
};

export function getInitialEaseFactor() {
  return SRS.startingEaseFactor;
}

function addMs(date: Date, ms: number) {
  return new Date(date.getTime() + ms);
}

function addDays(date: Date, days: number) {
  return addMs(date, days * DAY_MS);
}

function clampEase(value: number) {
  return Math.max(SRS.minimumEaseFactor, Number(value.toFixed(2)));
}

function clampInterval(days: number) {
  return Math.min(SRS.maximumIntervalDays, Math.max(1, Math.round(days)));
}

function isReviewCard(input: ComputeNextReviewStateInput) {
  return input.previousState !== "new" && input.intervalDays !== null;
}

function maybeMastered({
  rating,
  repetitionCount,
  intervalDays,
}: {
  rating: PackReviewRating;
  repetitionCount: number;
  intervalDays: number | null;
}) {
  return (
    (rating === "good" || rating === "easy") &&
    (repetitionCount >= SRS.masteryRepetitionThreshold ||
      (intervalDays ?? 0) >= SRS.masteryIntervalThresholdDays)
  );
}

export function computeNextReviewState(input: ComputeNextReviewStateInput): NextReviewState {
  const reviewedAt = input.reviewedAt;
  const easeFactor = input.easeFactor ?? SRS.startingEaseFactor;
  const reviewCard = isReviewCard(input);

  if (input.rating === "again") {
    const nextEaseFactor = reviewCard ? clampEase(easeFactor - 0.2) : easeFactor;

    return {
      state: "learning",
      dueAt: addMs(reviewedAt, SRS.firstLearningStepMs),
      repetitionCount: reviewCard ? 0 : input.repetitionCount,
      lapseCount: input.lapseCount + 1,
      intervalDays: null,
      easeFactor: nextEaseFactor,
      masteredAt: null,
    };
  }

  if (!reviewCard) {
    const repetitionCount = input.repetitionCount + 1;
    const isSecondLearningStep = input.repetitionCount > 0 && input.previousRating === "good";
    const hardDueAt = addMs(
      reviewedAt,
      isSecondLearningStep
        ? SRS.secondLearningStepMs
        : Math.round((SRS.firstLearningStepMs + SRS.secondLearningStepMs) / 2),
    );

    const learningResult = {
      hard: {
        dueAt: hardDueAt,
        intervalDays: null,
        easeFactor,
      },
      good: {
        dueAt: !isSecondLearningStep
          ? addMs(reviewedAt, SRS.secondLearningStepMs)
          : addDays(reviewedAt, SRS.graduatingIntervalDays),
        intervalDays: isSecondLearningStep ? SRS.graduatingIntervalDays : null,
        easeFactor,
      },
      easy: {
        dueAt: addDays(reviewedAt, SRS.easyIntervalDays),
        intervalDays: SRS.easyIntervalDays,
        easeFactor,
      },
    }[input.rating];

    const mastered = maybeMastered({
      rating: input.rating,
      repetitionCount,
      intervalDays: learningResult.intervalDays,
    });

    return {
      state: mastered ? "mastered" : "learning",
      dueAt: learningResult.dueAt,
      repetitionCount,
      lapseCount: input.lapseCount,
      intervalDays: learningResult.intervalDays,
      easeFactor: learningResult.easeFactor,
      masteredAt: mastered ? reviewedAt : null,
    };
  }

  const previousInterval = Math.max(1, input.intervalDays ?? 1);
  const repetitionCount = input.repetitionCount + 1;
  const reviewResult = {
    hard: {
      intervalDays: Math.max(
        previousInterval + 1,
        clampInterval(previousInterval * SRS.hardIntervalMultiplier),
      ),
      easeFactor: clampEase(easeFactor - 0.15),
    },
    good: {
      intervalDays: Math.max(previousInterval + 1, clampInterval(previousInterval * easeFactor)),
      easeFactor,
    },
    easy: {
      intervalDays: Math.max(
        previousInterval + 1,
        clampInterval(previousInterval * easeFactor * SRS.easyBonus),
      ),
      easeFactor: clampEase(easeFactor + 0.15),
    },
  }[input.rating];

  const mastered = maybeMastered({
    rating: input.rating,
    repetitionCount,
    intervalDays: reviewResult.intervalDays,
  });

  return {
    state: mastered ? "mastered" : "learning",
    dueAt: addDays(reviewedAt, reviewResult.intervalDays),
    repetitionCount,
    lapseCount: input.lapseCount,
    intervalDays: reviewResult.intervalDays,
    easeFactor: reviewResult.easeFactor,
    masteredAt: mastered ? reviewedAt : null,
  };
}

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

  if (state === "mastered" || state === "new") {
    return state;
  }

  return dueAt && dueAt.getTime() <= now.getTime() ? "due" : "learning";
}

export function getNextReviewLabel(dueAt: Date | string | null, now = new Date()) {
  if (!dueAt) {
    return null;
  }

  const dueDate = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const diffMs = dueDate.getTime() - now.getTime();

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

  const days = Math.ceil(hours / 24);
  return `${days}d`;
}
