import "server-only";

import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { computeNextReviewState, toPackSrsState } from "@/features/packs/lib/srs";
import { computeNextStreak } from "@/features/packs/lib/streak";
import type { PackReviewRating, PackSrsState } from "@/features/packs/types";
import { db } from "@/lib/server/db";
import { pack, packItem, reviewEvent, userStreak, userTermState } from "@/lib/server/db/schema";

export type ReviewItemInput = {
  userId: string;
  packId: string;
  item: typeof packItem.$inferSelect;
  rating: PackReviewRating;
  responseTimeMs: number | null;
};

export type ReviewItemResult = {
  itemId: string;
  nextState: PackSrsState;
  dueAt: Date;
  nextDueAt: Date | null;
  reviewedCards: number;
};

/**
 * Executes the full review cycle for a single pack item: SRS scheduling,
 * term-state propagation across packs, streak upsert, and review event logging.
 */
export async function executeReview(input: ReviewItemInput): Promise<ReviewItemResult> {
  const { userId, packId, item, rating, responseTimeMs } = input;
  const reviewedAt = new Date();

  // ── SRS scheduling ──────────────────────────────────────────────────────────
  const next = computeNextReviewState({
    rating,
    reviewedAt,
    previousState: toPackSrsState(item.state),
    previousRating: item.lastRating,
    repetitionCount: item.repetitionCount,
    lapseCount: item.lapseCount,
    intervalDays: item.intervalDays,
    easeFactor: item.easeFactor,
  });

  // ── Term state logic ────────────────────────────────────────────────────────
  const knownAfterReview = next.state === "mastered" && (rating === "good" || rating === "easy");
  const [existingTermState] = await db
    .select({ state: userTermState.state })
    .from(userTermState)
    .where(and(eq(userTermState.userId, userId), eq(userTermState.termId, item.termId)))
    .limit(1);
  const shouldDemoteKnownTerm = existingTermState?.state === "known" && rating === "again";
  const shouldPreserveKnownTerm =
    existingTermState?.state === "known" && rating !== "again" && !knownAfterReview;
  const nextTermState = knownAfterReview ? "known" : shouldPreserveKnownTerm ? "known" : "learning";

  // ── Streak computation ──────────────────────────────────────────────────────
  const [existingStreak] = await db
    .select()
    .from(userStreak)
    .where(eq(userStreak.userId, userId))
    .limit(1);
  const nextStreak = computeNextStreak({
    previousLastStudyAt: existingStreak?.lastStudyAt ?? null,
    previousCurrent: existingStreak?.currentStreakDays ?? 0,
    previousLongest: existingStreak?.longestStreakDays ?? 0,
    reviewedAt,
  });

  // ── Review event logging ────────────────────────────────────────────────────
  await db.insert(reviewEvent).values({
    id: crypto.randomUUID(),
    userId,
    packItemId: item.id,
    termId: item.termId,
    rating,
    reviewedAt,
    responseTimeMs,
  });

  // ── Pack item update ────────────────────────────────────────────────────────
  await db
    .update(packItem)
    .set({
      state: next.state,
      dueAt: next.dueAt,
      lastReviewedAt: reviewedAt,
      lastRating: rating,
      repetitionCount: next.repetitionCount,
      lapseCount: next.lapseCount,
      intervalDays: next.intervalDays,
      easeFactor: next.easeFactor,
      firstStudiedAt: item.firstStudiedAt ?? reviewedAt,
      masteredAt: next.masteredAt,
      updatedAt: reviewedAt,
    })
    .where(eq(packItem.id, item.id));

  // ── Term-state upsert ───────────────────────────────────────────────────────
  await db
    .insert(userTermState)
    .values({
      userId,
      termId: item.termId,
      state: nextTermState,
      source: "review",
      totalReviews: 1,
      totalLapses: rating === "again" ? 1 : 0,
      lastPackItemId: item.id,
      firstSeenAt: reviewedAt,
      lastSeenAt: reviewedAt,
      lastReviewedAt: reviewedAt,
      knownAt: nextTermState === "known" ? reviewedAt : null,
    })
    .onConflictDoUpdate({
      target: [userTermState.userId, userTermState.termId],
      set: {
        state: nextTermState,
        source: "review",
        totalReviews: sql`${userTermState.totalReviews} + 1`,
        totalLapses:
          rating === "again" ? sql`${userTermState.totalLapses} + 1` : userTermState.totalLapses,
        lastPackItemId: item.id,
        firstSeenAt: sql`coalesce(${userTermState.firstSeenAt}, ${reviewedAt})`,
        lastSeenAt: reviewedAt,
        lastReviewedAt: reviewedAt,
        knownAt:
          nextTermState === "known"
            ? sql`coalesce(${userTermState.knownAt}, ${reviewedAt})`
            : shouldDemoteKnownTerm
              ? null
              : userTermState.knownAt,
        updatedAt: reviewedAt,
      },
    });

  // ── Cross-pack term-state propagation ───────────────────────────────────────
  const matchingRows = await db
    .select({ id: packItem.id })
    .from(packItem)
    .innerJoin(pack, eq(pack.id, packItem.packId))
    .where(
      and(
        eq(pack.userId, userId),
        eq(packItem.termId, item.termId),
        ne(packItem.state, "removed"),
        isNull(packItem.removedAt),
      ),
    );
  const matchingIds = matchingRows.map((row) => row.id);
  if (knownAfterReview && matchingIds.length > 0) {
    await db
      .update(packItem)
      .set({ state: "mastered", masteredAt: reviewedAt, updatedAt: reviewedAt })
      .where(inArray(packItem.id, matchingIds));
  } else if (shouldDemoteKnownTerm && matchingIds.length > 0) {
    await db
      .update(packItem)
      .set({
        state: "learning",
        dueAt: next.dueAt,
        masteredAt: null,
        updatedAt: reviewedAt,
      })
      .where(inArray(packItem.id, matchingIds));
  }

  // ── Streak upsert ──────────────────────────────────────────────────────────
  await db
    .insert(userStreak)
    .values({
      userId,
      currentStreakDays: nextStreak.currentStreakDays,
      longestStreakDays: nextStreak.longestStreakDays,
      lastStudyAt: reviewedAt,
      streakStartedAt: nextStreak.streakStartedAt ?? existingStreak?.streakStartedAt ?? reviewedAt,
    })
    .onConflictDoUpdate({
      target: userStreak.userId,
      set: {
        currentStreakDays: nextStreak.currentStreakDays,
        longestStreakDays: nextStreak.longestStreakDays,
        lastStudyAt: reviewedAt,
        streakStartedAt:
          nextStreak.streakStartedAt ?? existingStreak?.streakStartedAt ?? reviewedAt,
        updatedAt: reviewedAt,
      },
    });

  // ── Pack timestamp update ───────────────────────────────────────────────────
  await db.update(pack).set({ updatedAt: reviewedAt }).where(eq(pack.id, packId));

  // ── Compute next due for the pack (for UI) ─────────────────────────────────
  const nextDueRows = await db
    .select({ dueAt: packItem.dueAt })
    .from(packItem)
    .where(
      and(
        eq(packItem.packId, packId),
        ne(packItem.state, "new"),
        ne(packItem.state, "mastered"),
        ne(packItem.state, "removed"),
        isNull(packItem.removedAt),
      ),
    );
  const nextDueAt =
    nextDueRows
      .map((row) => row.dueAt)
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  return {
    itemId: item.id,
    nextState: next.state,
    dueAt: next.dueAt,
    nextDueAt,
    reviewedCards: next.repetitionCount,
  };
}
