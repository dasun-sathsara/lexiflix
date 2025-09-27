"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Bell, Clapperboard, Home, Library, List, Search, Settings2 } from "lucide-react";
import type * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
};

const baseNavItems = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Browse",
    url: "/browse",
    icon: Search,
    items: [
      {
        title: "Trending",
        url: "/browse/trending",
      },
      {
        title: "New Releases",
        url: "/browse/new",
      },
      {
        title: "Coming Soon",
        url: "/browse/coming-soon",
      },
    ],
  },
  {
    title: "My List",
    url: "/my-list",
    icon: List,
    badge: "8",
  },
  {
    title: "Library",
    url: "/library",
    icon: Library,
    items: [
      {
        title: "Movies",
        url: "/library/movies",
      },
      {
        title: "Series",
        url: "/library/series",
      },
      {
        title: "Originals",
        url: "/library/originals",
      },
    ],
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    badge: "3",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings2,
  },
] as const;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const navMain = useMemo(
    () =>
      baseNavItems.map((item) => {
        const nestedItems = item.items?.map((subItem) => ({
          ...subItem,
          isActive: pathname === subItem.url,
        }));

        const isActive =
          item.url === "/"
            ? pathname === "/"
            : pathname === item.url ||
              pathname.startsWith(`${item.url}/`) ||
              nestedItems?.some((subItem) => subItem.isActive);

        return {
          ...item,
          items: nestedItems,
          isActive,
        };
      }),
    [pathname],
  );

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shadow-sm">
                  <Clapperboard className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">LexiFlix</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">Entertainment</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarInput type="search" placeholder="Search titles..." className="mt-1" />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

// Inset wrapper that applies consistent spacing and surface styling for main content
export function AppInset({ className, children }: React.ComponentProps<typeof SidebarInset>) {
  return <SidebarInset className={className}>{children}</SidebarInset>;
}

// Simple, branded top bar that pairs with the inset layout
export function AppTopbar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:backdrop-blur border-b border-border sticky top-0 z-20">
      <div className="flex h-14 items-center gap-3 px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <div className="bg-sidebar-primary/15 text-sidebar-primary flex size-6 items-center justify-center rounded-md">
            <Clapperboard className="size-3.5" />
          </div>
          <h1 className="text-sm font-medium tracking-tight">{title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Placeholder action for consistency; can be replaced with app-specific actions */}
          <button
            type="button"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </button>
          {right}
        </div>
      </div>
    </header>
  );
}
