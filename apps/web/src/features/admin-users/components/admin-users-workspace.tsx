import { Activity, Ban, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { AppEmptyState, AppPanel, AppStat } from "@/components/common/app-surface";
import { LinkPendingIndicator } from "@/components/common/link-pending-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminUserRow } from "@/features/admin-users/components/admin-user-row";
import { AdminUsersSearch } from "@/features/admin-users/components/admin-users-search";
import type { AdminUsersQueryState, AdminUsersView } from "@/features/admin-users/types";
import { buildAdminUsersHref } from "@/features/admin-users/utils";
import { cn } from "@/lib/ui/cn";

interface AdminUsersWorkspaceProps extends AdminUsersView {
  queryState: AdminUsersQueryState;
  currentAdminId: string;
}

export function AdminUsersWorkspace({
  queryState,
  currentAdminId,
  users,
  stats,
  pagination,
}: AdminUsersWorkspaceProps) {
  const statusOptions = [
    { value: "all" as const, label: "All", count: stats.totalUsers },
    { value: "active" as const, label: "Active", count: stats.activeUsers },
    { value: "suspended" as const, label: "Disabled", count: stats.suspendedUsers },
  ];
  const isFiltered = Boolean(queryState.query) || queryState.status !== "all";

  return (
    <AppPageShell>
      <AppPageHeader
        heading="Users"
        description="Manage account access and generation allowances."
        stats={
          <>
            <AppStat icon={Users} label="Total" value={stats.totalUsers.toLocaleString()} />
            <AppStat
              icon={Activity}
              label="Active"
              value={stats.activeUsers.toLocaleString()}
              tone="success"
            />
            <AppStat
              icon={Ban}
              label="Disabled"
              value={stats.suspendedUsers.toLocaleString()}
              tone={stats.suspendedUsers > 0 ? "danger" : "default"}
            />
            <AppStat
              icon={Sparkles}
              label="Generations"
              value={stats.totalGenerations.toLocaleString()}
              tone="accent"
            />
          </>
        }
      />

      <AppPanel className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminUsersSearch queryState={queryState} isFiltered={isFiltered} />

        <nav
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-border/80 bg-muted/40 p-0.5 shadow-xs"
          aria-label="Filter users by account status"
        >
          {statusOptions.map((option) => {
            const active = queryState.status === option.value;
            return (
              <Link
                key={option.value}
                href={buildAdminUsersHref(queryState, { status: option.value, page: 1 })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
                <span className="rounded bg-muted px-1 text-[10px] tabular-nums text-muted-foreground">
                  {option.count}
                </span>
                <LinkPendingIndicator label={`Loading ${option.label} users`} />
              </Link>
            );
          })}
        </nav>
      </AppPanel>

      {users.length > 0 ? (
        <Card className="gap-0 py-0 shadow-sm">
          <CardHeader className="border-b py-3.5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Accounts</CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Access state and generation allowance at a glance.
                </CardDescription>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {pagination.totalResults.toLocaleString()} result
                {pagination.totalResults === 1 ? "" : "s"}
              </span>
            </div>
          </CardHeader>
          <div className="flex items-center gap-4 border-b bg-muted/25 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <span className="min-w-0 flex-1">Account</span>
            <span className="hidden w-24 shrink-0 md:block">Status</span>
            <span className="hidden w-44 shrink-0 sm:block">Generation allowance</span>
            <span className="size-8 shrink-0" aria-hidden="true" />
          </div>
          <CardContent className="divide-y p-0">
            {users.map((user) => (
              <AdminUserRow key={user.id} user={user} currentAdminId={currentAdminId} />
            ))}
          </CardContent>
        </Card>
      ) : (
        <AppEmptyState
          icon={Users}
          title={isFiltered ? "No users match these filters" : "No users yet"}
          description={
            isFiltered
              ? "Try another name, email address, or account status."
              : "Accounts will appear here after users sign up."
          }
          action={
            isFiltered ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/users">Clear filters</Link>
              </Button>
            ) : undefined
          }
        />
      )}

      {pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between pt-1">
          <div>
            {pagination.page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildAdminUsersHref(queryState, { page: pagination.page - 1 })}>
                  ← Previous
                  <LinkPendingIndicator label="Loading previous page" />
                </Link>
              </Button>
            ) : null}
          </div>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <div>
            {pagination.page < pagination.totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildAdminUsersHref(queryState, { page: pagination.page + 1 })}>
                  Next →
                  <LinkPendingIndicator label="Loading next page" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </AppPageShell>
  );
}
