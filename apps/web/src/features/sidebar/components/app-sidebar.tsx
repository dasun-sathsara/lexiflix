"use client";

import {
  Bell,
  Clapperboard,
  Home,
  type LucideIcon,
  Search,
  Settings2,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavUser } from "@/features/sidebar/components/nav-user";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
};

const platformItems: NavItem[] = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Browse",
    url: "/browse",
    icon: Search,
  },
  {
    title: "My Decks",
    url: "/decks",
    icon: Sparkles,
    badge: "4",
  },
];

const generalItems: NavItem[] = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings2,
  },
];

const adminItems: NavItem[] = [
  {
    title: "Curated Admin",
    url: "/admin/curated",
    icon: Shield,
  },
];

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  read: boolean;
};

function createInitialNotifications(): NotificationItem[] {
  const now = Date.now();

  return [
    {
      id: "lexiflix-orig",
      title: "LexiFlix Original premieres tonight",
      description: 'Catch the global debut of "Midnight in Neon City" at 8PM.',
      createdAt: new Date(now - 1000 * 60 * 6),
      read: false,
    },
    {
      id: "watchlist-update",
      title: "New episodes added to your watchlist",
      description: 'Season 2 of "The Time Weavers" now streaming.',
      createdAt: new Date(now - 1000 * 60 * 32),
      read: false,
    },
    {
      id: "recommendations",
      title: "Three new picks just for you",
      description: "Based on your recent thrillers binge.",
      createdAt: new Date(now - 1000 * 60 * 60 * 5),
      read: true,
    },
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function formatRelativeTime(date: Date) {
  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min${diffInMinutes === 1 ? "" : "s"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hr${diffInHours === 1 ? "" : "s"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
}

// Clean navigation menu component with proper active states
function NavMenu({ items, label }: { items: NavItem[]; label?: string }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`);

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
              {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string;
    email: string;
    avatar?: string;
    role: "learner" | "admin";
  };
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const isAdmin = user.role === "admin";

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="border-r border-sidebar-border"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" variant={"plane"} asChild>
              <Link href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shadow-sm">
                  <Clapperboard className="size-[18px]" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="flex items-center gap-2 truncate font-semibold">
                    <span className="truncate">LexiFlix</span>
                    {isAdmin ? (
                      <Badge className="border border-amber-300/70 bg-amber-500/15 text-[10px] text-amber-900 dark:border-amber-500/30 dark:text-amber-100">
                        Admin
                      </Badge>
                    ) : null}
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Learn with entertainment
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMenu items={platformItems} label="Platform" />
        {isAdmin ? <NavMenu items={adminItems} label="Admin" /> : null}
        <NavMenu items={generalItems} label="General" />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

// Inset wrapper that applies consistent spacing and surface styling for main content
export function AppInset({ className, children }: React.ComponentProps<typeof SidebarInset>) {
  return <SidebarInset className={cn("bg-background", className)}>{children}</SidebarInset>;
}

// Simple, branded top bar that pairs with the inset layout
export function AppTopbar({ title, right }: { title: string; right?: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    createInitialNotifications(),
  );

  const { state } = useSidebar();

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  }, []);

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  }, []);

  const handleRemoveNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-sidebar-border",
        "bg-sidebar/80 backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/60",
      )}
    >
      <div className="flex h-14 items-center gap-3 px-4">
        <SidebarTrigger className="-ml-1" />
        <div
          className={cn(
            "h-4 w-px bg-border/60 transition-opacity duration-300",
            state === "collapsed" ? "opacity-0" : "opacity-100",
          )}
        />
        <div className="flex items-center gap-2">
          <div className="bg-sidebar-primary/15 text-sidebar-primary flex size-6 items-center justify-center rounded-md">
            <Clapperboard className="size-4" />
          </div>
          <h1 className="text-sm font-medium tracking-tight">{title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
              >
                <Bell className="size-[18px]" />
                {unreadCount > 0 && (
                  <span className="bg-destructive absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full">
                    <span className="sr-only">Unread notifications</span>
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <DropdownMenuLabel className="flex items-start justify-between gap-2 px-4 py-3 text-sm font-medium">
                <div className="flex flex-col gap-0.5">
                  <span>Notifications</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(event) => {
                    event.preventDefault();
                    handleMarkAllAsRead();
                  }}
                  disabled={unreadCount === 0}
                >
                  Mark all as read
                </Button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <div className="text-muted-foreground flex flex-col items-center gap-1 px-6 py-8 text-center text-sm">
                    <p>No notifications yet.</p>
                    <p className="text-xs">We'll keep you posted when something new arrives.</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        "items-start gap-3 px-4 py-3",
                        !notification.read && "bg-accent/10",
                      )}
                      onSelect={(event) => {
                        event.preventDefault();
                        handleMarkAsRead(notification.id);
                      }}
                    >
                      <span
                        className={cn(
                          "mt-1 flex size-2.5 rounded-full",
                          notification.read ? "bg-muted" : "bg-primary",
                        )}
                      />
                      <div className="flex flex-1 flex-col gap-1 text-left">
                        <p className="text-sm font-medium leading-none">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.description}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="-mr-1 size-7 text-muted-foreground hover:text-foreground"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleRemoveNotification(notification.id);
                        }}
                        aria-label="Remove notification"
                      >
                        <X className="size-4" />
                      </Button>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {right}
        </div>
      </div>
    </header>
  );
}
