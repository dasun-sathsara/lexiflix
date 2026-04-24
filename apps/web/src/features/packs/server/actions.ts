"use server";

import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { computeNextReviewState } from "@/features/packs/server/srs";
import { addUtcDays, getAppDateKey } from "@/features/packs/server/study-time";
import type {
  PackActionResult,
  PackRatingActionResult,
  PackReviewRating,
} from "@/features/packs/types";
import { requireSession } from "@/lib/auth-guards";
import { db } from "@/lib/server/db";
import { pack, packItem, reviewEvent, userStreak, userTermState } from "@/lib/server/db/schema";

const REVIEW_RATINGS = new Set<PackReviewRating>(["again", "hard", "good", "easy"]);

async function requireOwnedPack(packId: string, userId: string) {
  const rows = await db
    .select({ id: pack.id })
    .from(pack)
    .where(and(eq(pack.id, packId), eq(pack.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

async function countActiveItems(packId: string) {
  const rows = await db
    .select({ id: packItem.id })
    .from(packItem)
    .where(
      and(eq(packItem.packId, packId), ne(packItem.state, "removed"), isNull(packItem.removedAt)),
    );

  return rows.length;
}

function revalidatePackSurfaces(packId: string) {
  revalidatePath(`/pack/${packId}`);
  revalidatePath(`/study/${packId}`);
  revalidatePath("/decks");
  revalidatePath("/dashboard");
}

function computeNextStreak({
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

export async function removePackItemsAction(input: {
  packId: string;
  itemIds: string[];
}): Promise<PackActionResult> {
  const session = await requireSession();
  const itemIds = Array.from(new Set(input.itemIds.filter(Boolean)));

  if (itemIds.length === 0) {
    return { ok: false, error: "Select at least one card to remove." };
  }

  const ownedPack = await requireOwnedPack(input.packId, session.user.id);
  if (!ownedPack) {
    return { ok: false, error: "Pack not found." };
  }

  const ownedItems = await db
    .select({ id: packItem.id })
    .from(packItem)
    .where(and(eq(packItem.packId, input.packId), inArray(packItem.id, itemIds)));

  if (ownedItems.length !== itemIds.length) {
    return { ok: false, error: "One or more cards do not belong to this pack." };
  }

  const now = new Date();
  await db
    .update(packItem)
    .set({
      state: "removed",
      removedAt: now,
      removalReason: "user_removed",
      updatedAt: now,
    })
    .where(and(eq(packItem.packId, input.packId), inArray(packItem.id, itemIds)));

  const activeCount = await countActiveItems(input.packId);
  await db
    .update(pack)
    .set({ itemCount: activeCount, updatedAt: now })
    .where(eq(pack.id, input.packId));

  revalidatePackSurfaces(input.packId);

  return { ok: true, activeCount };
}

export async function resetPackProgressAction(input: {
  packId: string;
}): Promise<PackActionResult> {
  const session = await requireSession();
  const ownedPack = await requireOwnedPack(input.packId, session.user.id);
  if (!ownedPack) {
    return { ok: false, error: "Pack not found." };
  }

  const now = new Date();

  await db
    .update(packItem)
    .set({
      state: "new",
      dueAt: now,
      lastReviewedAt: null,
      lastRating: null,
      repetitionCount: 0,
      lapseCount: 0,
      intervalDays: null,
      easeFactor: 2.5,
      firstStudiedAt: null,
      masteredAt: null,
      removedAt: null,
      removalReason: null,
      updatedAt: now,
    })
    .where(eq(packItem.packId, input.packId));

  const activeCount = await countActiveItems(input.packId);
  await db
    .update(pack)
    .set({ itemCount: activeCount, updatedAt: now })
    .where(eq(pack.id, input.packId));

  revalidatePackSurfaces(input.packId);

  return { ok: true, activeCount };
}

export async function ratePackItemAction(input: {
  packId: string;
  itemId: string;
  rating: PackReviewRating;
  responseTimeMs?: number | null;
}): Promise<PackRatingActionResult> {
  const session = await requireSession();

  if (!REVIEW_RATINGS.has(input.rating)) {
    return { ok: false, error: "Choose a valid review rating." };
  }

  const ownedPack = await requireOwnedPack(input.packId, session.user.id);
  if (!ownedPack) {
    return { ok: false, error: "Pack not found." };
  }

  const rows = await db
    .select()
    .from(packItem)
    .where(and(eq(packItem.id, input.itemId), eq(packItem.packId, input.packId)))
    .limit(1);
  const item = rows[0] ?? null;

  if (!item) {
    return { ok: false, error: "Card not found." };
  }

  if (item.state === "removed" || item.removedAt) {
    return { ok: false, error: "Removed cards cannot be reviewed." };
  }

  const reviewedAt = new Date();
  const next = computeNextReviewState({
    rating: input.rating,
    reviewedAt,
    previousState:
      item.state === "mastered" ? "mastered" : item.state === "new" ? "new" : "learning",
    previousRating: item.lastRating,
    repetitionCount: item.repetitionCount,
    lapseCount: item.lapseCount,
    intervalDays: item.intervalDays,
    easeFactor: item.easeFactor,
  });
  const knownAfterReview =
    next.state === "mastered" && (input.rating === "good" || input.rating === "easy");

  const [existingStreak] = await db
    .select()
    .from(userStreak)
    .where(eq(userStreak.userId, session.user.id))
    .limit(1);
  const nextStreak = computeNextStreak({
    previousLastStudyAt: existingStreak?.lastStudyAt ?? null,
    previousCurrent: existingStreak?.currentStreakDays ?? 0,
    previousLongest: existingStreak?.longestStreakDays ?? 0,
    reviewedAt,
  });

  await db.batch([
    db.insert(reviewEvent).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      packItemId: item.id,
      termId: item.termId,
      rating: input.rating,
      reviewedAt,
      responseTimeMs: input.responseTimeMs ?? null,
    }),
    db
      .update(packItem)
      .set({
        state: next.state,
        dueAt: next.dueAt,
        lastReviewedAt: reviewedAt,
        lastRating: input.rating,
        repetitionCount: next.repetitionCount,
        lapseCount: next.lapseCount,
        intervalDays: next.intervalDays,
        easeFactor: next.easeFactor,
        firstStudiedAt: item.firstStudiedAt ?? reviewedAt,
        masteredAt: next.masteredAt,
        updatedAt: reviewedAt,
      })
      .where(eq(packItem.id, item.id)),
    db
      .insert(userTermState)
      .values({
        userId: session.user.id,
        termId: item.termId,
        state: knownAfterReview ? "known" : "learning",
        source: "review",
        totalReviews: 1,
        totalLapses: input.rating === "again" ? 1 : 0,
        lastPackItemId: item.id,
        firstSeenAt: reviewedAt,
        lastSeenAt: reviewedAt,
        lastReviewedAt: reviewedAt,
        knownAt: knownAfterReview ? reviewedAt : null,
      })
      .onConflictDoUpdate({
        target: [userTermState.userId, userTermState.termId],
        set: {
          state: knownAfterReview ? "known" : "learning",
          source: "review",
          totalReviews: sql`${userTermState.totalReviews} + 1`,
          totalLapses:
            input.rating === "again"
              ? sql`${userTermState.totalLapses} + 1`
              : userTermState.totalLapses,
          lastPackItemId: item.id,
          firstSeenAt: sql`coalesce(${userTermState.firstSeenAt}, ${reviewedAt})`,
          lastSeenAt: reviewedAt,
          lastReviewedAt: reviewedAt,
          knownAt: knownAfterReview
            ? sql`coalesce(${userTermState.knownAt}, ${reviewedAt})`
            : userTermState.knownAt,
          updatedAt: reviewedAt,
        },
      }),
    db
      .insert(userStreak)
      .values({
        userId: session.user.id,
        currentStreakDays: nextStreak.currentStreakDays,
        longestStreakDays: nextStreak.longestStreakDays,
        lastStudyAt: reviewedAt,
        streakStartedAt:
          nextStreak.streakStartedAt ?? existingStreak?.streakStartedAt ?? reviewedAt,
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
      }),
    db.update(pack).set({ updatedAt: reviewedAt }).where(eq(pack.id, input.packId)),
  ]);

  const nextDueRows = await db
    .select({ dueAt: packItem.dueAt })
    .from(packItem)
    .where(
      and(
        eq(packItem.packId, input.packId),
        ne(packItem.state, "new"),
        ne(packItem.state, "mastered"),
        ne(packItem.state, "removed"),
        isNull(packItem.removedAt),
      ),
    );
  const nextDueAt = nextDueRows
    .map((row) => row.dueAt)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  revalidatePackSurfaces(input.packId);

  return {
    ok: true,
    itemId: item.id,
    nextState: next.state,
    dueAt: next.dueAt.toISOString(),
    nextDueAt: nextDueAt ? nextDueAt.toISOString() : null,
    reviewedCards: next.repetitionCount,
  };
}
