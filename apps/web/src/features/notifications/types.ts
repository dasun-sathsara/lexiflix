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

export type ListNotificationsActionResult = {
  success: true;
  notifications: NotificationView[];
};

export type NotificationMutationResult =
  | { success: true }
  | {
      success: false;
      message: string;
    };
