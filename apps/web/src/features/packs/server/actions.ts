"use server";

import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { computeNextReviewState } from "@/features/packs/server/srs";
import { addUtcDays, getAppDateKey } from "@/features/packs/server/study-time";
import type {
  PackActionResult,
  PackItemActionResult,
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

async function requireOwnedPackItem({
  packId,
  itemId,
  userId,
}: {
  packId: string;
  itemId: string;
  userId: string;
}) {
  const rows = await db
    .select({ item: packItem })
    .from(packItem)
    .innerJoin(pack, eq(pack.id, packItem.packId))
    .where(and(eq(pack.id, packId), eq(pack.userId, userId), eq(packItem.id, itemId)))
    .limit(1);

  return rows[0]?.item ?? null;
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

export async function restorePackItemAction(input: {
  packId: string;
  itemId: string;
}): Promise<PackItemActionResult> {
  const session = await requireSession();
  const item = await requireOwnedPackItem({
    packId: input.packId,
    itemId: input.itemId,
    userId: session.user.id,
  });
  if (!item) {
    return { ok: false, error: "Card not found." };
  }

  const now = new Date();
  await db
    .update(packItem)
    .set({
      state: item.firstStudiedAt ? "learning" : "new",
      removedAt: null,
      removalReason: null,
      updatedAt: now,
    })
    .where(eq(packItem.id, item.id));

  const activeCount = await countActiveItems(input.packId);
  await db
    .update(pack)
    .set({ itemCount: activeCount, updatedAt: now })
    .where(eq(pack.id, input.packId));
  revalidatePackSurfaces(input.packId);

  return { ok: true, activeCount, itemId: item.id };
}

export async function resetPackItemAction(input: {
  packId: string;
  itemId: string;
}): Promise<PackItemActionResult> {
  const session = await requireSession();
  const item = await requireOwnedPackItem({
    packId: input.packId,
    itemId: input.itemId,
    userId: session.user.id,
  });
  if (!item) {
    return { ok: false, error: "Card not found." };
  }
  if (item.state === "removed" || item.removedAt) {
    return { ok: false, error: "Restore the card before resetting it." };
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
      updatedAt: now,
    })
    .where(eq(packItem.id, item.id));

  revalidatePackSurfaces(input.packId);
  return { ok: true, activeCount: await countActiveItems(input.packId), itemId: item.id };
}

async function updateTermStateAndCards({
  userId,
  item,
  nextState,
}: {
  userId: string;
  item: typeof packItem.$inferSelect;
  nextState: "known" | "learning" | "ignored";
}) {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(userTermState)
      .values({
        userId,
        termId: item.termId,
        state: nextState,
        source: "manual",
        lastPackItemId: item.id,
        firstSeenAt: now,
        lastSeenAt: now,
        knownAt: nextState === "known" ? now : null,
        ignoredAt: nextState === "ignored" ? now : null,
      })
      .onConflictDoUpdate({
        target: [userTermState.userId, userTermState.termId],
        set: {
          state: nextState,
          source: "manual",
          lastPackItemId: item.id,
          firstSeenAt: sql`coalesce(${userTermState.firstSeenAt}, ${now})`,
          lastSeenAt: now,
          knownAt:
            nextState === "known" ? now : nextState === "learning" ? null : userTermState.knownAt,
          ignoredAt: nextState === "ignored" ? now : null,
          updatedAt: now,
        },
      });

    const matchingRows = await tx
      .select({ id: packItem.id, packId: packItem.packId })
      .from(packItem)
      .innerJoin(pack, eq(pack.id, packItem.packId))
      .where(
        and(
          eq(pack.userId, userId),
          eq(packItem.termId, item.termId),
          isNull(packItem.removedAt),
          ne(packItem.state, "removed"),
        ),
      );

    if (matchingRows.length > 0) {
      if (nextState === "known") {
        await tx
          .update(packItem)
          .set({ state: "mastered", masteredAt: now, updatedAt: now })
          .where(
            inArray(
              packItem.id,
              matchingRows.map((row) => row.id),
            ),
          );
      } else if (nextState === "learning") {
        await tx
          .update(packItem)
          .set({ state: "learning", masteredAt: null, dueAt: now, updatedAt: now })
          .where(
            inArray(
              packItem.id,
              matchingRows.map((row) => row.id),
            ),
          );
      } else {
        await tx
          .update(packItem)
          .set({
            state: "removed",
            removedAt: now,
            removalReason: "term_ignored",
            updatedAt: now,
          })
          .where(
            inArray(
              packItem.id,
              matchingRows.map((row) => row.id),
            ),
          );
      }

      for (const packId of new Set(matchingRows.map((row) => row.packId))) {
        const activeRows = await tx
          .select({ id: packItem.id })
          .from(packItem)
          .where(
            and(
              eq(packItem.packId, packId),
              ne(packItem.state, "removed"),
              isNull(packItem.removedAt),
            ),
          );
        await tx
          .update(pack)
          .set({ itemCount: activeRows.length, updatedAt: now })
          .where(eq(pack.id, packId));
      }
    }
  });
}

async function runTermAction(input: {
  packId: string;
  itemId: string;
  nextState: "known" | "learning" | "ignored";
}): Promise<PackItemActionResult> {
  const session = await requireSession();
  const item = await requireOwnedPackItem({
    packId: input.packId,
    itemId: input.itemId,
    userId: session.user.id,
  });
  if (!item) {
    return { ok: false, error: "Card not found." };
  }

  await updateTermStateAndCards({
    userId: session.user.id,
    item,
    nextState: input.nextState,
  });
  revalidatePackSurfaces(input.packId);

  return { ok: true, activeCount: await countActiveItems(input.packId), itemId: item.id };
}

export async function markTermKnownAction(input: {
  packId: string;
  itemId: string;
}): Promise<PackItemActionResult> {
  return runTermAction({ ...input, nextState: "known" });
}

export async function markTermLearningAction(input: {
  packId: string;
  itemId: string;
}): Promise<PackItemActionResult> {
  return runTermAction({ ...input, nextState: "learning" });
}

export async function ignoreTermGloballyAction(input: {
  packId: string;
  itemId: string;
}): Promise<PackItemActionResult> {
  return runTermAction({ ...input, nextState: "ignored" });
}

export async function unignoreTermAction(input: {
  packId: string;
  itemId: string;
}): Promise<PackItemActionResult> {
  const session = await requireSession();
  const item = await requireOwnedPackItem({
    packId: input.packId,
    itemId: input.itemId,
    userId: session.user.id,
  });
  if (!item) {
    return { ok: false, error: "Card not found." };
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(userTermState)
      .values({
        userId: session.user.id,
        termId: item.termId,
        state: "learning",
        source: "manual",
        lastPackItemId: item.id,
        firstSeenAt: now,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: [userTermState.userId, userTermState.termId],
        set: {
          state: "learning",
          source: "manual",
          ignoredAt: null,
          lastPackItemId: item.id,
          lastSeenAt: now,
          updatedAt: now,
        },
      });
    const ignoredRows = await tx
      .select({ id: packItem.id, firstStudiedAt: packItem.firstStudiedAt })
      .from(packItem)
      .innerJoin(pack, eq(pack.id, packItem.packId))
      .where(
        and(
          eq(pack.userId, session.user.id),
          eq(packItem.termId, item.termId),
          eq(packItem.removalReason, "term_ignored"),
        ),
      );

    const newIds = ignoredRows.filter((row) => !row.firstStudiedAt).map((row) => row.id);
    const learningIds = ignoredRows.filter((row) => row.firstStudiedAt).map((row) => row.id);
    if (newIds.length > 0) {
      await tx
        .update(packItem)
        .set({ state: "new", removedAt: null, removalReason: null, updatedAt: now })
        .where(inArray(packItem.id, newIds));
    }
    if (learningIds.length > 0) {
      await tx
        .update(packItem)
        .set({ state: "learning", removedAt: null, removalReason: null, updatedAt: now })
        .where(inArray(packItem.id, learningIds));
    }
  });

  revalidatePackSurfaces(input.packId);
  return { ok: true, activeCount: await countActiveItems(input.packId), itemId: item.id };
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
  const [existingTermState] = await db
    .select({ state: userTermState.state })
    .from(userTermState)
    .where(and(eq(userTermState.userId, session.user.id), eq(userTermState.termId, item.termId)))
    .limit(1);
  const shouldDemoteKnownTerm = existingTermState?.state === "known" && input.rating === "again";
  const shouldPreserveKnownTerm =
    existingTermState?.state === "known" && input.rating !== "again" && !knownAfterReview;
  const nextTermState = knownAfterReview ? "known" : shouldPreserveKnownTerm ? "known" : "learning";

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

  await db.transaction(async (tx) => {
    await tx.insert(reviewEvent).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      packItemId: item.id,
      termId: item.termId,
      rating: input.rating,
      reviewedAt,
      responseTimeMs: input.responseTimeMs ?? null,
    });
    await tx
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
      .where(eq(packItem.id, item.id));
    await tx
      .insert(userTermState)
      .values({
        userId: session.user.id,
        termId: item.termId,
        state: nextTermState,
        source: "review",
        totalReviews: 1,
        totalLapses: input.rating === "again" ? 1 : 0,
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
            input.rating === "again"
              ? sql`${userTermState.totalLapses} + 1`
              : userTermState.totalLapses,
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
          ignoredAt: null,
          updatedAt: reviewedAt,
        },
      });
    const matchingRows = await tx
      .select({ id: packItem.id })
      .from(packItem)
      .innerJoin(pack, eq(pack.id, packItem.packId))
      .where(
        and(
          eq(pack.userId, session.user.id),
          eq(packItem.termId, item.termId),
          ne(packItem.state, "removed"),
          isNull(packItem.removedAt),
        ),
      );
    const matchingIds = matchingRows.map((row) => row.id);
    if (knownAfterReview && matchingIds.length > 0) {
      await tx
        .update(packItem)
        .set({ state: "mastered", masteredAt: reviewedAt, updatedAt: reviewedAt })
        .where(inArray(packItem.id, matchingIds));
    } else if (shouldDemoteKnownTerm && matchingIds.length > 0) {
      await tx
        .update(packItem)
        .set({
          state: "learning",
          dueAt: next.dueAt,
          masteredAt: null,
          updatedAt: reviewedAt,
        })
        .where(inArray(packItem.id, matchingIds));
    }
    await tx
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
      });
    await tx.update(pack).set({ updatedAt: reviewedAt }).where(eq(pack.id, input.packId));
  });

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
