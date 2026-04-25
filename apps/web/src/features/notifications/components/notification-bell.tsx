"use client";

import { Bell, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  dismissNotificationAction,
  listNotificationsAction,
  markAllVisibleNotificationsReadAction,
  markNotificationReadAction,
} from "../server/actions";
import type { NotificationView } from "../types";

function formatRelativeTime(value: string) {
  const diffInSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes === 1 ? "" : "s"} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hr${diffInHours === 1 ? "" : "s"} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationView[]>([]);
  const [isPending, startTransition] = useTransition();
  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => notification.status !== "read" && notification.status !== "dismissed",
      ).length,
    [notifications],
  );

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await listNotificationsAction();
      setNotifications(result.notifications);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, status: "read" } : notification,
      ),
    );
    startTransition(async () => {
      await markNotificationReadAction({ id });
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    const ids = notifications.map((notification) => notification.id);
    setNotifications((prev) => prev.map((notification) => ({ ...notification, status: "read" })));
    startTransition(async () => {
      await markAllVisibleNotificationsReadAction({ ids });
    });
  }, [notifications]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    startTransition(async () => {
      await dismissNotificationAction({ id });
    });
  }, []);

  return (
    <DropdownMenu onOpenChange={(open) => open && refresh()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <Bell className={cn("size-4", isPending && "animate-pulse")} />
          {unreadCount > 0 ? (
            <span className="-right-0.5 -top-0.5 absolute flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-start justify-between gap-2 px-4 py-3 text-sm font-medium">
          <div>
            <p>Notifications</p>
            <p className="font-normal text-xs text-muted-foreground">
              {unreadCount ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {notifications.length > 0 ? (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={markAllAsRead}>
              Mark all read
            </Button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto py-1">
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              <p>No notifications yet.</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const isUnread =
                notification.status !== "read" && notification.status !== "dismissed";
              const content = (
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1.5 size-2 rounded-full",
                        isUnread ? "bg-primary" : "bg-muted",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-none">{notification.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{notification.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn("items-start gap-2 px-4 py-3", isUnread && "bg-accent/10")}
                  onSelect={(event) => {
                    event.preventDefault();
                    markAsRead(notification.id);
                  }}
                >
                  {notification.href ? (
                    <Link href={notification.href} className="min-w-0 flex-1">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      dismiss(notification.id);
                    }}
                    aria-label="Dismiss notification"
                  >
                    <X className="size-3.5" />
                  </Button>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
