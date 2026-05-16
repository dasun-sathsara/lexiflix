import { describe, expect, it, vi } from "vitest";
import {
  type ComputeNextReviewStateInput,
  computeNextReviewState,
  getEffectivePackCardState,
  SRS_CONFIG,
} from "./srs";

vi.mock("server-only", () => ({}));

const REVIEWED_AT = new Date("2026-01-15T12:00:00.000Z");

function newCardInput(
  overrides: Partial<ComputeNextReviewStateInput> = {},
): ComputeNextReviewStateInput {
  return {
    rating: "good",
    reviewedAt: REVIEWED_AT,
    previousState: "new",
    repetitionCount: 0,
    lapseCount: 0,
    intervalDays: null,
    easeFactor: null,
    ...overrides,
  };
}

describe("computeNextReviewState", () => {
  it("graduates a new card through the two-step learning pipeline", () => {
    const firstPass = computeNextReviewState(newCardInput({ rating: "good" }));

    expect(firstPass).toMatchObject({
      state: "learning",
      repetitionCount: 1,
      lapseCount: 0,
      intervalDays: null,
      easeFactor: SRS_CONFIG.startingEaseFactor,
      masteredAt: null,
    });
    expect(firstPass.dueAt).toEqual(
      new Date(REVIEWED_AT.getTime() + SRS_CONFIG.secondLearningStepMs),
    );

    const secondPass = computeNextReviewState(
      newCardInput({
        rating: "good",
        previousState: firstPass.state,
        previousRating: "good",
        repetitionCount: firstPass.repetitionCount,
        lapseCount: firstPass.lapseCount,
        intervalDays: firstPass.intervalDays,
        easeFactor: firstPass.easeFactor,
      }),
    );

    expect(secondPass).toMatchObject({
      state: "learning",
      repetitionCount: 2,
      lapseCount: 0,
      intervalDays: SRS_CONFIG.graduatingIntervalDays,
      easeFactor: SRS_CONFIG.startingEaseFactor,
      masteredAt: null,
    });
    expect(secondPass.dueAt).toEqual(
      new Date(REVIEWED_AT.getTime() + SRS_CONFIG.graduatingIntervalDays * 24 * 60 * 60 * 1000),
    );
  });

  it("resets a graduated review card to the first learning step on again", () => {
    const result = computeNextReviewState({
      rating: "again",
      reviewedAt: REVIEWED_AT,
      previousState: "learning",
      repetitionCount: 6,
      lapseCount: 1,
      intervalDays: 14,
      easeFactor: 2.5,
    });

    expect(result).toMatchObject({
      state: "learning",
      repetitionCount: 0,
      lapseCount: 2,
      intervalDays: null,
      easeFactor: 2.3,
      masteredAt: null,
    });
    expect(result.dueAt).toEqual(new Date(REVIEWED_AT.getTime() + SRS_CONFIG.firstLearningStepMs));
  });

  it("marks a review card mastered when the next interval crosses the mastery threshold", () => {
    const result = computeNextReviewState({
      rating: "good",
      reviewedAt: REVIEWED_AT,
      previousState: "learning",
      repetitionCount: 3,
      lapseCount: 0,
      intervalDays: 21,
      easeFactor: 2.5,
    });

    expect(result.intervalDays).toBeGreaterThanOrEqual(SRS_CONFIG.masteryIntervalThresholdDays);
    expect(result).toMatchObject({
      state: "mastered",
      repetitionCount: 4,
      lapseCount: 0,
      masteredAt: REVIEWED_AT,
    });
    const intervalDays = result.intervalDays;
    expect(intervalDays).not.toBeNull();
    if (intervalDays === null) {
      throw new Error("intervalDays is null");
    }
    expect(result.dueAt).toEqual(
      new Date(REVIEWED_AT.getTime() + intervalDays * 24 * 60 * 60 * 1000),
    );
  });
});

describe("getEffectivePackCardState", () => {
  it("promotes a learning card to due once its scheduled time has passed", () => {
    const dueAt = new Date("2026-01-15T11:00:00.000Z");
    const now = new Date("2026-01-15T12:00:00.000Z");

    expect(getEffectivePackCardState({ state: "learning", dueAt, now })).toBe("due");
    expect(
      getEffectivePackCardState({
        state: "learning",
        dueAt: new Date("2026-01-15T12:30:00.000Z"),
        now,
      }),
    ).toBe("learning");
  });
});
