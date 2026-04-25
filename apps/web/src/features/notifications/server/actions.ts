"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth-guards";
import type { ListNotificationsActionResult, NotificationMutationResult } from "../types";
import {
  dismissNotification,
  listUserNotifications,
  markNotificationRead,
  markVisibleNotificationsRead,
} from "./queries";

const notificationIdSchema = z.object({ id: z.string().min(1) });
const notificationIdsSchema = z.object({ ids: z.array(z.string().min(1)).max(25) });

export async function listNotificationsAction(): Promise<ListNotificationsActionResult> {
  const session = await requireSession();
  return {
    ok: true,
    data: {
      notifications: await listUserNotifications({ userId: session.user.id }),
    },
  };
}

export async function markNotificationReadAction(
  input: z.input<typeof notificationIdSchema>,
): Promise<NotificationMutationResult> {
  const session = await requireSession();
  const parsed = notificationIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid notification." };
  }

  await markNotificationRead({ userId: session.user.id, id: parsed.data.id });
  return { ok: true, data: undefined };
}

export async function markAllVisibleNotificationsReadAction(
  input: z.input<typeof notificationIdsSchema>,
): Promise<NotificationMutationResult> {
  const session = await requireSession();
  const parsed = notificationIdsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid notifications." };
  }

  await markVisibleNotificationsRead({ userId: session.user.id, ids: parsed.data.ids });
  return { ok: true, data: undefined };
}

export async function dismissNotificationAction(
  input: z.input<typeof notificationIdSchema>,
): Promise<NotificationMutationResult> {
  const session = await requireSession();
  const parsed = notificationIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid notification." };
  }

  await dismissNotification({ userId: session.user.id, id: parsed.data.id });
  return { ok: true, data: undefined };
}
