"use server";

import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  PackActionResult,
  PackItemActionResult,
  PackRatingActionResult,
  PackReviewRating,
} from "@/features/packs/types";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/server/db";
import { pack, packItem } from "@/lib/server/db/schema";
import { getOwnedPackId } from "./queries";
import { executeReview } from "./review-service";
import { updateTermStateAndCards } from "./term-state-service";

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const packIdSchema = z.object({
  packId: z.string().min(1),
});

const packItemSchema = z.object({
  packId: z.string().min(1),
  itemId: z.string().min(1),
});

const removePackItemsSchema = z.object({
  packId: z.string().min(1),
  itemIds: z.array(z.string().min(1)).min(1),
});

const ratePackItemSchema = z.object({
  packId: z.string().min(1),
  itemId: z.string().min(1),
  rating: z.enum(["again", "hard", "good", "easy"]),
  responseTimeMs: z.number().int().nonnegative().nullable().optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function revalidatePackSurfaces(packId: string, options?: { includeStudyRoute?: boolean }) {
  revalidatePath(`/pack/${packId}`);
  if (options?.includeStudyRoute ?? true) {
    revalidatePath(`/study/${packId}`);
  }
  revalidatePath("/decks");
  revalidatePath("/dashboard");
}

// ─── Actions ────────────────────────────────────────────────────────────────

/**
 * Permanently removes one or more items from a user's pack.
 * Validates ownership and updates the pack's item count.
 */
export async function removePackItemsAction(input: {
  packId: string;
  itemIds: string[];
}): Promise<PackActionResult> {
  const parsedInput = removePackItemsSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: "Select at least one card to remove." };
  }
  const parsed = parsedInput.data;
  const session = await requireSession();
  const itemIds = Array.from(new Set(parsed.itemIds.filter(Boolean)));

  if (itemIds.length === 0) {
    return { ok: false, error: "Select at least one card to remove." };
  }

  const ownedPack = await getOwnedPackId({ packId: parsed.packId, userId: session.user.id });
  if (!ownedPack) {
    return { ok: false, error: "Pack not found." };
  }

  const ownedItems = await db
    .select({ id: packItem.id })
    .from(packItem)
    .where(and(eq(packItem.packId, parsed.packId), inArray(packItem.id, itemIds)));

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
    .where(and(eq(packItem.packId, parsed.packId), inArray(packItem.id, itemIds)));

  const activeCount = await countActiveItems(parsed.packId);
  await db
    .update(pack)
    .set({ itemCount: activeCount, updatedAt: now })
    .where(eq(pack.id, parsed.packId));

  revalidatePackSurfaces(parsed.packId);

  return { ok: true, data: { activeCount } };
}

/**
 * Resets the study progress for an entire pack.
 * Clears SRS state, due dates, and repetition counts for all active items in the pack.
 */
export async function resetPackProgressAction(input: {
  packId: string;
}): Promise<PackActionResult> {
  const parsedInput = packIdSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: "Invalid request." };
  }
  const parsed = parsedInput.data;
  const session = await requireSession();
  const ownedPack = await getOwnedPackId({ packId: parsed.packId, userId: session.user.id });
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
      updatedAt: now,
    })
    .where(
      and(
        eq(packItem.packId, parsed.packId),
        ne(packItem.state, "removed"),
        isNull(packItem.removedAt),
      ),
    );

  const activeCount = await countActiveItems(parsed.packId);
  await db
    .update(pack)
    .set({ itemCount: activeCount, updatedAt: now })
    .where(eq(pack.id, parsed.packId));

  revalidatePackSurfaces(parsed.packId);

  return { ok: true, data: { activeCount } };
}

/**
 * Restores a previously removed item back to active status in a pack.
 * The item enters the "new" learning state upon restoration.
 */
export async function restorePackItemAction(input: {
  packId: string;
  itemId: string;
}): Promise<PackItemActionResult> {
  const parsedInput = packItemSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: "Invalid request." };
  }
  const parsed = parsedInput.data;
  const session = await requireSession();
  const item = await requireOwnedPackItem({
    packId: parsed.packId,
    itemId: parsed.itemId,
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
      dueAt: now,
      removedAt: null,
      removalReason: null,
      updatedAt: now,
    })
    .where(eq(packItem.id, item.id));

  const activeCount = await countActiveItems(parsed.packId);
  await db
    .update(pack)
    .set({ itemCount: activeCount, updatedAt: now })
    .where(eq(pack.id, parsed.packId));
  revalidatePackSurfaces(parsed.packId);

  return { ok: true, data: { activeCount, itemId: item.id } };
}

/**
 * Resets the study progress for a single specific item in a pack.
 * The item will be returned to the "new" state and its SRS history will be cleared.
 */
export async function resetPackItemAction(input: {
  packId: string;
  itemId: string;
}): Promise<PackItemActionResult> {
  const parsedInput = packItemSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: "Invalid request." };
  }
  const parsed = parsedInput.data;
  const session = await requireSession();
  const item = await requireOwnedPackItem({
    packId: parsed.packId,
    itemId: parsed.itemId,
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

  revalidatePackSurfaces(parsed.packId);
  return {
    ok: true,
    data: { activeCount: await countActiveItems(parsed.packId), itemId: item.id },
  };
}

async function runTermAction(input: {
  packId: string;
  itemId: string;
  nextState: "known" | "learning" | "ignored";
}): Promise<PackItemActionResult> {
  const parsedInput = packItemSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: "Invalid request." };
  }
  const parsed = parsedInput.data;
  const session = await requireSession();
  const item = await requireOwnedPackItem({
    packId: parsed.packId,
    itemId: parsed.itemId,
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
  revalidatePackSurfaces(parsed.packId);

  return {
    ok: true,
    data: { activeCount: await countActiveItems(parsed.packId), itemId: item.id },
  };
}

/**
 * Marks a specific term as known globally for the user.
 * Known terms will be prioritized differently during future pack generation.
 */
export async function markTermKnownAction(input: {
  packId: string;
  itemId: string;
}): Promise<PackItemActionResult> {
  return runTermAction({ ...input, nextState: "known" });
}

/**
 * Marks a specific term as currently learning globally for the user.
 */
export async function markTermLearningAction(input: {
  packId: string;
  itemId: string;
}): Promise<PackItemActionResult> {
  return runTermAction({ ...input, nextState: "learning" });
}

/**
 * Ignores a specific term globally.
 * Ignored terms will be excluded from default queues and future pack generation.
 */
export async function ignoreTermGloballyAction(input: {
  packId: string;
  itemId: string;
}): Promise<PackItemActionResult> {
  return runTermAction({ ...input, nextState: "ignored" });
}

/**
 * Unignores a previously ignored term, returning it to learning.
 */
export async function unignoreTermAction(input: {
  packId: string;
  itemId: string;
}): Promise<PackItemActionResult> {
  return runTermAction({ ...input, nextState: "learning" });
}

/**
 * Records a user's rating for a pack item and computes its next SRS state.
 * Updates the user's daily study streak, appends a review event log, and schedules the next review.
 */
export async function ratePackItemAction(input: {
  packId: string;
  itemId: string;
  rating: PackReviewRating;
  responseTimeMs?: number | null;
}): Promise<PackRatingActionResult> {
  const parsedInput = ratePackItemSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: "Choose a valid review rating." };
  }
  const parsed = parsedInput.data;
  const session = await requireSession();

  const ownedPack = await getOwnedPackId({ packId: parsed.packId, userId: session.user.id });
  if (!ownedPack) {
    return { ok: false, error: "Pack not found." };
  }

  const rows = await db
    .select()
    .from(packItem)
    .where(and(eq(packItem.id, parsed.itemId), eq(packItem.packId, parsed.packId)))
    .limit(1);
  const item = rows[0] ?? null;

  if (!item) {
    return { ok: false, error: "Card not found." };
  }

  if (item.state === "removed" || item.removedAt) {
    return { ok: false, error: "Removed cards cannot be reviewed." };
  }

  const result = await executeReview({
    userId: session.user.id,
    packId: parsed.packId,
    item,
    rating: parsed.rating,
    responseTimeMs: parsed.responseTimeMs ?? null,
  });

  revalidatePackSurfaces(parsed.packId, { includeStudyRoute: false });

  return {
    ok: true,
    data: {
      itemId: result.itemId,
      nextState: result.nextState,
      dueAt: result.dueAt.toISOString(),
      nextDueAt: result.nextDueAt ? result.nextDueAt.toISOString() : null,
      reviewedCards: result.reviewedCards,
    },
  };
}
