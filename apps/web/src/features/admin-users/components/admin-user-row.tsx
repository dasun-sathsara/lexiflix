"use client";

import { Ban, Gauge, Loader2, MoreHorizontal, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setUserSuspendedAction } from "@/features/admin-users/server/actions";
import type { AdminUserRow as AdminUserRowData } from "@/features/admin-users/types";
import { formatAbsoluteDate } from "@/lib/primitives/dates";
import { cn } from "@/lib/ui/cn";

import { AdminUserLimitDialog } from "./admin-user-limit-dialog";
import { AdminUserSuspendDialog } from "./admin-user-suspend-dialog";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

interface AdminUserRowProps {
  user: AdminUserRowData;
  currentAdminId: string;
}

export function AdminUserRow({ user, currentAdminId }: AdminUserRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);

  const isCurrentUser = user.id === currentAdminId;
  const isProtected = isCurrentUser || user.role === "admin";
  const usagePercent =
    user.generationLimit === null
      ? null
      : user.generationLimit === 0
        ? 100
        : Math.min(100, (user.generationCount / user.generationLimit) * 100);

  function reactivateUser() {
    startTransition(async () => {
      try {
        const result = await setUserSuspendedAction({
          userId: user.id,
          suspended: false,
          reason: undefined,
        });

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success("Account reactivated");
        router.refresh();
      } catch {
        toast.error("Could not update this account.");
      }
    });
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30",
        user.banned && "bg-rose-500/[0.025]",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="size-9 shrink-0 border border-border/70 shadow-xs">
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback className="bg-muted text-[11px] font-semibold">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold tracking-tight">{user.name}</span>
            {user.role === "admin" ? (
              <span className="rounded border border-amber-300/60 bg-amber-500/8 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-500/30 dark:text-amber-300">
                Admin
              </span>
            ) : null}
            {isCurrentUser ? <span className="text-[11px] text-muted-foreground">You</span> : null}
            {user.banned ? (
              <span className="text-[11px] font-medium text-rose-600 md:hidden dark:text-rose-400">
                Disabled
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
            Joined {formatAbsoluteDate(user.createdAt) ?? user.createdAt}
            {!user.emailVerified ? " · Email unverified" : ""}
          </p>
        </div>
      </div>

      <div className="hidden w-24 shrink-0 md:block">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium",
            user.banned ? "text-rose-600 dark:text-rose-400" : "text-foreground",
          )}
        >
          <span
            className={cn("size-1.5 rounded-full", user.banned ? "bg-rose-500" : "bg-emerald-500")}
          />
          {user.banned ? "Disabled" : "Active"}
        </span>
        {user.banned && user.banReason ? (
          <p
            className="mt-1 max-w-24 truncate text-[10px] text-muted-foreground"
            title={user.banReason}
          >
            {user.banReason}
          </p>
        ) : null}
      </div>

      <div className="hidden w-44 shrink-0 sm:block">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold tabular-nums">
            {user.generationCount.toLocaleString()}
            <span className="ml-1 text-[11px] font-normal text-muted-foreground">used</span>
          </p>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {user.generationLimit === null
              ? "Unlimited"
              : `of ${user.generationLimit.toLocaleString()}`}
          </span>
        </div>
        {usagePercent === null ? (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/4 rounded-full bg-muted-foreground/25" />
          </div>
        ) : (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width]",
                usagePercent >= 100
                  ? "bg-rose-500"
                  : usagePercent >= 80
                    ? "bg-amber-500"
                    : "bg-blue-500",
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        )}
        <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
          {user.completedGenerationCount} completed · {user.failedGenerationCount} failed
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isPending}
            className="size-8 shrink-0 text-muted-foreground opacity-60 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
            <span className="sr-only">Manage {user.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[190px]">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setLimitDialogOpen(true);
            }}
          >
            <Gauge className="size-3.5" />
            Set generation limit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.banned ? (
            <DropdownMenuItem
              disabled={isProtected}
              onSelect={(event) => {
                event.preventDefault();
                reactivateUser();
              }}
            >
              <UserRoundCheck className="size-3.5" />
              Reactivate account
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              disabled={isProtected}
              onSelect={(event) => {
                event.preventDefault();
                setSuspendDialogOpen(true);
              }}
            >
              <Ban className="size-3.5" />
              Disable account
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AdminUserLimitDialog
        open={limitDialogOpen}
        onOpenChange={setLimitDialogOpen}
        userId={user.id}
        userName={user.name}
        currentLimit={user.generationLimit}
        generationCount={user.generationCount}
      />

      <AdminUserSuspendDialog
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        userId={user.id}
        userName={user.name}
      />
    </div>
  );
}
