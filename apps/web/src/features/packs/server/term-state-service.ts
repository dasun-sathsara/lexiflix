import "server-only";

import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { pack, packItem, userTermState } from "@/lib/server/db/schema";

/**
 * Updates the global user-term-state and propagates the new state across all
 * packs that contain the same term. Used for manual term actions (mark known,
 * mark learning, ignore/unignore).
 */
export async function updateTermStateAndCards({
  userId,
  item,
  nextState,
}: {
  userId: string;
  item: typeof packItem.$inferSelect;
  nextState: "known" | "learning" | "ignored";
}) {
  const now = new Date();
  await db
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
        ignoredAt:
          nextState === "ignored" ? now : nextState === "learning" ? null : userTermState.ignoredAt,
        updatedAt: now,
      },
    });

  const matchingRows = await db
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

  if (matchingRows.length === 0) {
    return;
  }

  const matchingIds = matchingRows.map((row) => row.id);
  if (nextState === "known") {
    await db
      .update(packItem)
      .set({ state: "mastered", masteredAt: now, updatedAt: now })
      .where(inArray(packItem.id, matchingIds));
  } else if (nextState === "ignored") {
    await db
      .update(packItem)
      .set({ state: "removed", removedAt: now, removalReason: "globally_ignored", updatedAt: now })
      .where(inArray(packItem.id, matchingIds));
  } else {
    await db
      .update(packItem)
      .set({
        state: "learning",
        masteredAt: null,
        dueAt: now,
        removedAt: null,
        removalReason: null,
        updatedAt: now,
      })
      .where(inArray(packItem.id, matchingIds));
  }

  for (const packId of new Set(matchingRows.map((row) => row.packId))) {
    const activeRows = await db
      .select({ id: packItem.id })
      .from(packItem)
      .where(
        and(eq(packItem.packId, packId), ne(packItem.state, "removed"), isNull(packItem.removedAt)),
      );

    await db
      .update(pack)
      .set({ itemCount: activeRows.length, updatedAt: now })
      .where(eq(pack.id, packId));
  }
}
