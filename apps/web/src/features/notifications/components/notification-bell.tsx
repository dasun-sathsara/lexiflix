"use client";

import { Bell, BookOpen, CheckCheck, Flame, Info, Play, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  clearAllNotificationsAction,
  dismissNotificationAction,
  listNotificationsAction,
  markAllVisibleNotificationsReadAction,
  markNotificationReadAction,
} from "../server/actions";
import type { NotificationView } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(value: string) {
  const diffInSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

type NotificationType = NotificationView["type"];

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; iconClass: string; dotClass: string }
> = {
  pack_ready: {
    icon: BookOpen,
    iconClass: "bg-primary/10 text-primary",
    dotClass: "bg-primary",
  },
  reviews_due: {
    icon: Play,
    iconClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    dotClass: "bg-rose-500",
  },
  streak_risk: {
    icon: Flame,
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  system: {
    icon: Info,
    iconClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

// ---------------------------------------------------------------------------
// NotificationItem
// ---------------------------------------------------------------------------

function NotificationItem({
  notification,
  onRead,
  onDismiss,
}: {
  notification: NotificationView;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const isUnread = notification.status !== "read" && notification.status !== "dismissed";
  const config = typeConfig[notification.type] ?? typeConfig.system;
  const Icon = config.icon;

  const inner = (
    <div className="flex min-w-0 flex-1 gap-3">
      <div
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
          config.iconClass,
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-1.5">
          {isUnread ? (
            <span className={cn("size-1.5 shrink-0 rounded-full", config.dotClass)} />
          ) : null}
          <p
            className={cn(
              "truncate text-sm leading-snug",
              isUnread ? "font-semibold" : "font-medium text-muted-foreground",
            )}
          >
            {notification.title}
          </p>
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {notification.body}
        </p>
        <p className="text-[11px] text-muted-foreground/60">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "group relative flex items-start gap-2 rounded-lg px-3 py-2.5 transition-colors",
        isUnread ? "bg-accent/40 hover:bg-accent/60" : "hover:bg-accent/30",
      )}
    >
      {notification.href ? (
        <Link
          href={notification.href}
          className="min-w-0 flex-1"
          onClick={() => onRead(notification.id)}
        >
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          className="min-w-0 flex-1 cursor-default text-left"
          onClick={() => isUnread && onRead(notification.id)}
        >
          {inner}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(notification.id)}
        aria-label="Dismiss"
        className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NotificationBell
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationView[]>([]);
  const [isPending, startTransition] = useTransition();

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.status !== "read" && n.status !== "dismissed").length,
    [notifications],
  );

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await listNotificationsAction();
      if (result.ok) setNotifications(result.data.notifications);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: "read" } : n)));
    startTransition(async () => {
      await markNotificationReadAction({ id });
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    const ids = notifications.map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
    startTransition(async () => {
      await markAllVisibleNotificationsReadAction({ ids });
    });
  }, [notifications]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => {
      await dismissNotificationAction({ id });
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    startTransition(async () => {
      await clearAllNotificationsAction();
    });
  }, []);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) refresh();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <Bell className={cn("size-4", isPending && "animate-pulse")} />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[360px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {notifications.length > 0 ? (
            <div className="flex items-center gap-1">
              {unreadCount > 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={clearAll}
              >
                <Trash2 className="size-3.5" />
                Clear
              </Button>
            </div>
          ) : null}
        </div>

        {/* List */}
        <div className="max-h-[420px] space-y-1 overflow-y-auto p-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <div className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Bell className="size-5" />
              </div>
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground">You're all caught up.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={markAsRead}
                onDismiss={dismiss}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
