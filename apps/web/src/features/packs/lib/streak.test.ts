import { describe, expect, it } from "vitest";
import { computeNextStreak } from "./streak";

describe("computeNextStreak", () => {
  it("starts a new streak when there is no previous study", () => {
    const reviewedAt = new Date("2026-03-10T10:00:00.000Z"); // 15:30 IST
    const result = computeNextStreak({
      previousLastStudyAt: null,
      previousCurrent: 0,
      previousLongest: 0,
      reviewedAt,
    });

    expect(result).toEqual({
      currentStreakDays: 1,
      longestStreakDays: 1,
      streakStartedAt: reviewedAt,
    });
  });

  it("keeps the same streak when reviewing on the same app-timezone day", () => {
    // Both are on the same day in Asia/Colombo (2026-03-10 IST)
    const previousLastStudyAt = new Date("2026-03-10T02:00:00.000Z"); // 07:30 IST
    const reviewedAt = new Date("2026-03-10T14:00:00.000Z"); // 19:30 IST

    const result = computeNextStreak({
      previousLastStudyAt,
      previousCurrent: 3,
      previousLongest: 7,
      reviewedAt,
    });

    expect(result).toEqual({
      currentStreakDays: 3,
      longestStreakDays: 7,
      streakStartedAt: undefined,
    });
  });

  it("extends the streak when reviewing on the next app-timezone day", () => {
    // Previous: 2026-03-10 in Asia/Colombo
    const previousLastStudyAt = new Date("2026-03-10T16:00:00.000Z"); // 21:30 IST Mar 10
    // Current: 2026-03-11 in Asia/Colombo
    const reviewedAt = new Date("2026-03-11T02:00:00.000Z"); // 07:30 IST Mar 11

    const result = computeNextStreak({
      previousLastStudyAt,
      previousCurrent: 5,
      previousLongest: 5,
      reviewedAt,
    });

    expect(result).toEqual({
      currentStreakDays: 6,
      longestStreakDays: 6,
      streakStartedAt: undefined,
    });
  });

  it("resets the streak after a gap of more than one day", () => {
    // Previous: 2026-03-08 in Asia/Colombo
    const previousLastStudyAt = new Date("2026-03-08T10:00:00.000Z");
    // Current: 2026-03-10 in Asia/Colombo (skipped Mar 9)
    const reviewedAt = new Date("2026-03-10T10:00:00.000Z");

    const result = computeNextStreak({
      previousLastStudyAt,
      previousCurrent: 4,
      previousLongest: 10,
      reviewedAt,
    });

    expect(result).toEqual({
      currentStreakDays: 1,
      longestStreakDays: 10,
      streakStartedAt: reviewedAt,
    });
  });

  it("updates longestStreakDays when current exceeds previous longest", () => {
    const previousLastStudyAt = new Date("2026-03-09T10:00:00.000Z");
    const reviewedAt = new Date("2026-03-10T10:00:00.000Z");

    const result = computeNextStreak({
      previousLastStudyAt,
      previousCurrent: 10,
      previousLongest: 10,
      reviewedAt,
    });

    expect(result).toEqual({
      currentStreakDays: 11,
      longestStreakDays: 11,
      streakStartedAt: undefined,
    });
  });
});
