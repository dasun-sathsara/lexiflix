import "server-only";

import { and, asc, desc, eq, inArray, isNull, lte, ne } from "drizzle-orm";
import { getAppDateKey } from "@/features/packs/server/study-time";
import { db } from "@/lib/server/db";
import { notification, pack, packItem } from "@/lib/server/db/schema";
import type { NotificationView } from "../types";

function mapNotification(row: typeof notification.$inferSelect): NotificationView {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    title: row.title,
    body: row.body,
    href: row.href,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null,
  };
}

export async function listUserNotifications({
  userId,
  limit = 10,
}: {
  userId: string;
  limit?: number;
}) {
  await reconcileDueReviewNotificationForUser({ userId });

  const rows = await db
    .select()
    .from(notification)
    .where(and(eq(notification.userId, userId), ne(notification.status, "dismissed")))
    .orderBy(desc(notification.createdAt))
    .limit(limit);

  return rows.map(mapNotification);
}

export async function reconcileDueReviewNotificationForUser({ userId }: { userId: string }) {
  const now = new Date();
  const appDay = getAppDateKey(now);

  const dueRows = await db
    .select({
      packId: pack.id,
      itemId: packItem.id,
    })
    .from(packItem)
    .innerJoin(pack, eq(pack.id, packItem.packId))
    .where(
      and(
        eq(pack.userId, userId),
        eq(pack.status, "active"),
        ne(packItem.state, "new"),
        ne(packItem.state, "mastered"),
        ne(packItem.state, "removed"),
        isNull(packItem.removedAt),
        lte(packItem.dueAt, now),
      ),
    )
    .orderBy(asc(packItem.dueAt), asc(packItem.sortOrder));

  if (dueRows.length === 0) {
    return;
  }

  const existingRows = await db
    .select({
      id: notification.id,
      payload: notification.payload,
    })
    .from(notification)
    .where(and(eq(notification.userId, userId), eq(notification.type, "reviews_due")))
    .orderBy(desc(notification.createdAt))
    .limit(30);

  const alreadyCreatedForAppDay = existingRows.some((row) => {
    const payload = row.payload;
    return (
      payload &&
      typeof payload === "object" &&
      "kind" in payload &&
      payload.kind === "reviews_due" &&
      "appDay" in payload &&
      payload.appDay === appDay
    );
  });

  if (alreadyCreatedForAppDay) {
    return;
  }

  const firstPackId = dueRows[0]?.packId ?? null;
  await db.insert(notification).values({
    id: crypto.randomUUID(),
    userId,
    type: "reviews_due",
    channel: "in_app",
    status: "sent",
    title: "Reviews due",
    body:
      dueRows.length === 1
        ? "1 card is ready for review."
        : `${dueRows.length} cards are ready for review.`,
    href: firstPackId ? `/study/${firstPackId}` : "/decks",
    payload: {
      kind: "reviews_due",
      appDay,
      dueCount: dueRows.length,
      firstPackId,
    },
    sentAt: now,
  });
}

export async function countUnreadNotifications({ userId }: { userId: string }) {
  const rows = await listUserNotifications({ userId, limit: 50 });
  return rows.filter((row) => row.status !== "read" && row.status !== "dismissed").length;
}

export async function createPackReadyNotification({
  userId,
  jobId,
  packId,
  title,
}: {
  userId: string;
  jobId: string;
  packId: string;
  title: string;
}) {
  await db.insert(notification).values({
    id: crypto.randomUUID(),
    userId,
    type: "pack_ready",
    channel: "in_app",
    status: "sent",
    title: "Pack ready",
    body: `${title} vocabulary is ready to study.`,
    href: `/pack/${packId}`,
    payload: { jobId, packId },
    sentAt: new Date(),
  });
}

export async function createPackFailedNotification({
  userId,
  jobId,
  title,
}: {
  userId: string;
  jobId: string;
  title: string;
}) {
  await db.insert(notification).values({
    id: crypto.randomUUID(),
    userId,
    type: "system",
    channel: "in_app",
    status: "sent",
    title: "Pack generation failed",
    body: `${title} vocabulary could not be generated.`,
    href: `/generation/${jobId}`,
    payload: { jobId },
    sentAt: new Date(),
  });
}

export async function markNotificationRead({ userId, id }: { userId: string; id: string }) {
  const now = new Date();
  await db
    .update(notification)
    .set({ status: "read", readAt: now, updatedAt: now })
    .where(and(eq(notification.userId, userId), eq(notification.id, id)));
}

export async function markVisibleNotificationsRead({
  userId,
  ids,
}: {
  userId: string;
  ids: string[];
}) {
  if (ids.length === 0) return;
  const now = new Date();
  await db
    .update(notification)
    .set({ status: "read", readAt: now, updatedAt: now })
    .where(and(eq(notification.userId, userId), inArray(notification.id, ids)));
}

export async function dismissNotification({ userId, id }: { userId: string; id: string }) {
  const now = new Date();
  await db
    .update(notification)
    .set({ status: "dismissed", dismissedAt: now, updatedAt: now })
    .where(and(eq(notification.userId, userId), eq(notification.id, id)));
}
