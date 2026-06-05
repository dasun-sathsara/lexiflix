import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { notification } from "@/lib/server/db/schema";
import type { NotificationView } from "../types";
import { reconcileDueReviewNotificationForUser } from "./mutations";

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
