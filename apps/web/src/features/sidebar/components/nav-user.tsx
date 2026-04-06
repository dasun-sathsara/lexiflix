"use client";

import { BadgeCheck, Bell, ChevronsUpDown, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { logoutAction } from "@/features/auth/actions";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar?: string;
    role: "learner" | "admin";
  };
}) {
  const { isMobile } = useSidebar();
  const [isPending, startTransition] = useTransition();
  const isAdmin = user.role === "admin";

  const handleLogout = () => {
    startTransition(async () => {
      const result = await logoutAction();
      if (result.success) {
        toast.success("Logged out successfully");
        window.location.href = "/";
      } else {
        toast.error(result.message || "Failed to log out");
      }
    });
  };

  // Generate initials from name
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar
                className={
                  "h-8 w-8 rounded-lg " +
                  (isAdmin ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-sidebar" : "")
                }
              >
                {user.avatar && (
                  <AvatarImage
                    src={user.avatar}
                    alt={user.name}
                    className="size-full object-cover"
                  />
                )}
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="flex items-center gap-2 truncate font-medium">
                  <span className="truncate">{user.name}</span>
                  {isAdmin ? (
                    <Badge className="border border-amber-300/70 bg-amber-500/15 text-[10px] text-amber-900 dark:border-amber-500/30 dark:text-amber-100">
                      Admin
                    </Badge>
                  ) : null}
                </span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-[18px]" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar
                  className={
                    "h-8 w-8 rounded-lg " +
                    (isAdmin ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-background" : "")
                  }
                >
                  {user.avatar && (
                    <AvatarImage
                      src={user.avatar}
                      alt={user.name}
                      className="size-full object-cover"
                    />
                  )}
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="flex items-center gap-2 truncate font-medium">
                    <span className="truncate">{user.name}</span>
                    {isAdmin ? (
                      <Badge className="border border-amber-300/70 bg-amber-500/15 text-[10px] text-amber-900 dark:border-amber-500/30 dark:text-amber-100">
                        Admin
                      </Badge>
                    ) : null}
                  </span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings?tab=account">
                  <BadgeCheck />
                  Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings?tab=preferences">
                  <Bell />
                  Preferences
                </Link>
              </DropdownMenuItem>
              {isAdmin ? (
                <DropdownMenuItem asChild>
                  <Link href="/admin/curated">
                    <Shield />
                    Curated Admin
                  </Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={isPending}>
              <LogOut />
              {isPending ? "Logging out..." : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
