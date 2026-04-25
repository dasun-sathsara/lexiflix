"use client";

import {
  Clapperboard,
  Film,
  Home,
  type LucideIcon,
  Search,
  Settings2,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { Badge } from "@/components/ui/badge";
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
import { NotificationBell } from "@/features/notifications/components/notification-bell";
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
    title: "Curated",
    url: "/curated",
    icon: Film,
  },
  {
    title: "My Decks",
    url: "/decks",
    icon: Sparkles,
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
            <SidebarMenuButton
              size="lg"
              variant={"plane"}
              className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
              asChild
            >
              <Link href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-9 items-center justify-center rounded-xl shadow-sm">
                  <Clapperboard className="size-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="flex items-center gap-2 truncate font-semibold">
                    <span className="truncate">LexiFlix</span>
                    {isAdmin ? (
                      <Badge className="border border-amber-300/70 bg-amber-500/15 text-[11px] text-amber-900 dark:border-amber-500/30 dark:text-amber-100">
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
  const { state } = useSidebar();

  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-sidebar-border",
        "bg-sidebar/80 backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/60",
      )}
    >
      <div className="flex h-12 items-center gap-3 px-4">
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
          <span className="text-sm font-medium tracking-tight">{title}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          {right}
        </div>
      </div>
    </header>
  );
}
