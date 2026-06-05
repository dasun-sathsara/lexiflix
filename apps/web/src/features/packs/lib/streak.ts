import { addUtcDays, getAppDateKey } from "@/features/packs/lib/study-time";

/**
 * Computes the next streak state based on the user's previous streak
 * and the current review timestamp. Streak boundaries are aligned to
 * the application timezone (Asia/Colombo).
 */
export function computeNextStreak({
  previousLastStudyAt,
  previousCurrent,
  previousLongest,
  reviewedAt,
}: {
  previousLastStudyAt: Date | null;
  previousCurrent: number;
  previousLongest: number;
  reviewedAt: Date;
}) {
  const todayKey = getAppDateKey(reviewedAt);
  const previousKey = previousLastStudyAt ? getAppDateKey(previousLastStudyAt) : null;
  const yesterdayKey = addUtcDays(todayKey, -1);
  const currentStreakDays =
    previousKey === todayKey
      ? previousCurrent
      : previousKey === yesterdayKey
        ? previousCurrent + 1
        : 1;

  return {
    currentStreakDays,
    longestStreakDays: Math.max(previousLongest, currentStreakDays),
    streakStartedAt:
      previousKey === todayKey || previousKey === yesterdayKey ? undefined : reviewedAt,
  };
}
