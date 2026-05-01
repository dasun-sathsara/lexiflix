import type { ActionResult } from "@/lib/action-result";

export type NotificationView = {
  id: string;
  type: "pack_ready" | "reviews_due" | "streak_risk" | "system";
  status: "queued" | "sent" | "read" | "dismissed" | "failed";
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
  readAt: string | null;
};

export type ListNotificationsActionResult = ActionResult<{
  notifications: NotificationView[];
}>;

export type NotificationMutationResult = ActionResult;
