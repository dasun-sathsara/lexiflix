import { describe, expect, it } from "vitest";
import { SRS_CONFIG } from "@/lib/constants";
import {
  type ComputeNextReviewStateInput,
  computeNextReviewState,
  getEffectivePackCardState,
  getNextReviewLabel,
  getRatingIntervalPreviews,
  toPackSrsState,
} from "./srs";

const REVIEWED_AT = new Date("2026-01-15T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

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
      new Date(REVIEWED_AT.getTime() + SRS_CONFIG.graduatingIntervalDays * DAY_MS),
    );
  });

  it("keeps a learning card on a short step when rated hard", () => {
    const result = computeNextReviewState(newCardInput({ rating: "hard" }));

    expect(result).toMatchObject({
      state: "learning",
      repetitionCount: 1,
      intervalDays: null,
      easeFactor: SRS_CONFIG.startingEaseFactor,
    });
    expect(result.dueAt.getTime() - REVIEWED_AT.getTime()).toBe(
      Math.round((SRS_CONFIG.firstLearningStepMs + SRS_CONFIG.secondLearningStepMs) / 2),
    );
  });

  it("graduates a learning card straight to the easy interval", () => {
    const result = computeNextReviewState(newCardInput({ rating: "easy" }));

    expect(result.intervalDays).toBe(SRS_CONFIG.easyIntervalDays);
    expect(result.dueAt).toEqual(
      new Date(REVIEWED_AT.getTime() + SRS_CONFIG.easyIntervalDays * DAY_MS),
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
      easeFactor: 2.5 - SRS_CONFIG.lapseEasePenalty,
      masteredAt: null,
    });
    expect(result.dueAt).toEqual(new Date(REVIEWED_AT.getTime() + SRS_CONFIG.firstLearningStepMs));
  });

  it("keeps learning progress and ease when a card lapses before graduating", () => {
    const result = computeNextReviewState(
      newCardInput({ rating: "again", previousState: "learning", repetitionCount: 1 }),
    );

    expect(result).toMatchObject({
      repetitionCount: 1,
      lapseCount: 1,
      easeFactor: SRS_CONFIG.startingEaseFactor,
    });
  });

  it("lowers ease on hard and raises it on easy for graduated cards", () => {
    const graduated = { previousState: "learning", intervalDays: 10, easeFactor: 2.5 } as const;

    expect(computeNextReviewState(newCardInput({ ...graduated, rating: "hard" }))).toMatchObject({
      easeFactor: 2.5 - SRS_CONFIG.hardEasePenalty,
      intervalDays: 12,
    });
    expect(computeNextReviewState(newCardInput({ ...graduated, rating: "easy" }))).toMatchObject({
      easeFactor: 2.5 + SRS_CONFIG.easyEaseBonus,
      intervalDays: 33,
    });
  });

  it("always pushes a graduated card at least one day further out", () => {
    const result = computeNextReviewState(
      newCardInput({
        rating: "hard",
        previousState: "learning",
        intervalDays: 1,
        easeFactor: SRS_CONFIG.minimumEaseFactor,
      }),
    );

    expect(result.intervalDays).toBe(2);
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
    if (intervalDays === null) {
      throw new Error("intervalDays is null");
    }
    expect(result.dueAt).toEqual(new Date(REVIEWED_AT.getTime() + intervalDays * DAY_MS));
  });
});

describe("toPackSrsState", () => {
  it("collapses derived and removed states onto learning", () => {
    expect(toPackSrsState("new")).toBe("new");
    expect(toPackSrsState("mastered")).toBe("mastered");
    expect(toPackSrsState("learning")).toBe("learning");
    expect(toPackSrsState("due")).toBe("learning");
    expect(toPackSrsState("removed")).toBe("learning");
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

  it("reports removed cards as removed even when only removedAt is set", () => {
    expect(
      getEffectivePackCardState({
        state: "learning",
        dueAt: null,
        now: REVIEWED_AT,
        removedAt: REVIEWED_AT,
      }),
    ).toBe("removed");
  });

  it("leaves new and mastered cards untouched", () => {
    expect(getEffectivePackCardState({ state: "new", dueAt: null, now: REVIEWED_AT })).toBe("new");
    expect(
      getEffectivePackCardState({ state: "mastered", dueAt: REVIEWED_AT, now: REVIEWED_AT }),
    ).toBe("mastered");
  });
});

describe("getNextReviewLabel", () => {
  it("formats the wait time using the coarsest useful unit", () => {
    const now = REVIEWED_AT;

    expect(getNextReviewLabel(null, now)).toBeNull();
    expect(getNextReviewLabel(new Date(now.getTime() - 1), now)).toBe("due now");
    expect(getNextReviewLabel(new Date(now.getTime() + 10 * 60 * 1000), now)).toBe("10m");
    expect(getNextReviewLabel(new Date(now.getTime() + 3 * 60 * 60 * 1000), now)).toBe("3h");
    expect(getNextReviewLabel(new Date(now.getTime() + 4 * DAY_MS).toISOString(), now)).toBe("4d");
  });
});

describe("getRatingIntervalPreviews", () => {
  it("returns a non-empty label for every rating", () => {
    const previews = getRatingIntervalPreviews({
      reviewedAt: new Date(),
      previousState: "learning",
      previousRating: "good",
      repetitionCount: 2,
      lapseCount: 0,
      intervalDays: 5,
      easeFactor: 2.5,
    });

    expect(Object.keys(previews)).toEqual(["again", "hard", "good", "easy"]);
    for (const label of Object.values(previews)) {
      expect(label).not.toBe("");
    }
  });
});
