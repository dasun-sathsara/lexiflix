import type { AdminUserStatus, AdminUsersQueryState } from "@/features/admin-users/types";

const PAGE_SIZE = 20;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAdminUsersSearchParams(
  params: Record<string, string | string[] | undefined>,
): AdminUsersQueryState {
  const rawStatus = firstValue(params.status);
  const status: AdminUserStatus =
    rawStatus === "active" || rawStatus === "suspended" ? rawStatus : "all";
  const rawPage = Number.parseInt(firstValue(params.page) ?? "1", 10);

  return {
    query: (firstValue(params.q) ?? "").trim().slice(0, 100),
    status,
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

export function buildAdminUsersHref(
  queryState: AdminUsersQueryState,
  overrides: Partial<AdminUsersQueryState> = {},
) {
  const next = { ...queryState, ...overrides };
  const params = new URLSearchParams();

  if (next.query) params.set("q", next.query);
  if (next.status !== "all") params.set("status", next.status);
  if (next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export const ADMIN_USERS_PAGE_SIZE = PAGE_SIZE;
