"use server";

import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { PackActionResult } from "@/features/packs/types";
import { requireSession } from "@/lib/auth-guards";
import { db } from "@/lib/server/db";
import { pack, packItem } from "@/lib/server/db/schema";

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
