import "server-only";

import type { SQL } from "drizzle-orm";
import { and, count, desc, eq, or, sql } from "drizzle-orm";
import type {
  AdminUserRow,
  AdminUsersQueryState,
  AdminUsersView,
} from "@/features/admin-users/types";
import { ADMIN_USERS_PAGE_SIZE } from "@/features/admin-users/utils";
import { db } from "@/lib/server/db";
import { packGenerationJob, session, user } from "@/lib/server/db/schema";

function escapeLikePattern(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function buildUserFilter(queryState: AdminUsersQueryState): SQL | undefined {
  const conditions: SQL[] = [];

  if (queryState.query) {
    const pattern = `%${escapeLikePattern(queryState.query)}%`;
    const searchCondition = or(
      sql`${user.name} ILIKE ${pattern} ESCAPE '\\'`,
      sql`${user.email} ILIKE ${pattern} ESCAPE '\\'`,
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  if (queryState.status === "active") conditions.push(eq(user.banned, false));
  if (queryState.status === "suspended") conditions.push(eq(user.banned, true));

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getAdminUsersView(queryState: AdminUsersQueryState): Promise<AdminUsersView> {
  const where = buildUserFilter(queryState);

  const [summaryRows, filteredCountRows] = await Promise.all([
    db
      .select({
        totalUsers: sql<number>`count(distinct ${user.id})::int`,
        suspendedUsers: sql<number>`count(distinct ${user.id}) filter (where ${user.banned} = true)::int`,
        totalGenerations: sql<number>`count(${packGenerationJob.id})::int`,
      })
      .from(user)
      .leftJoin(packGenerationJob, eq(packGenerationJob.userId, user.id)),
    db.select({ value: count() }).from(user).where(where),
  ]);

  const totalResults = filteredCountRows[0]?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalResults / ADMIN_USERS_PAGE_SIZE));
  const page = Math.min(queryState.page, totalPages);

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      createdAt: user.createdAt,
      generationLimit: user.generationLimit,
      generationCount: sql<number>`count(${packGenerationJob.id})::int`,
      completedGenerationCount: sql<number>`count(${packGenerationJob.id}) filter (where ${packGenerationJob.status} = 'completed')::int`,
      failedGenerationCount: sql<number>`count(${packGenerationJob.id}) filter (where ${packGenerationJob.status} = 'failed')::int`,
      lastGenerationAt: sql<string | null>`max(${packGenerationJob.createdAt})`,
    })
    .from(user)
    .leftJoin(packGenerationJob, eq(packGenerationJob.userId, user.id))
    .where(where)
    .groupBy(
      user.id,
      user.name,
      user.email,
      user.emailVerified,
      user.image,
      user.role,
      user.banned,
      user.banReason,
      user.createdAt,
      user.generationLimit,
    )
    .orderBy(desc(user.createdAt), desc(user.id))
    .limit(ADMIN_USERS_PAGE_SIZE)
    .offset((page - 1) * ADMIN_USERS_PAGE_SIZE);

  const users: AdminUserRow[] = rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    lastGenerationAt: row.lastGenerationAt ? new Date(row.lastGenerationAt).toISOString() : null,
  }));
  const summary = summaryRows[0] ?? {
    totalUsers: 0,
    suspendedUsers: 0,
    totalGenerations: 0,
  };

  return {
    users,
    stats: {
      totalUsers: summary.totalUsers,
      activeUsers: summary.totalUsers - summary.suspendedUsers,
      suspendedUsers: summary.suspendedUsers,
      totalGenerations: summary.totalGenerations,
    },
    pagination: { page, totalPages, totalResults },
  };
}

export async function getManagedUser(userId: string) {
  return db.query.user.findFirst({
    columns: { id: true, email: true, role: true, banned: true },
    where: eq(user.id, userId),
  });
}

export async function setManagedUserSuspended(input: {
  userId: string;
  suspended: boolean;
  reason?: string;
}) {
  const [updated] = await db
    .update(user)
    .set({
      banned: input.suspended,
      banReason: input.suspended ? input.reason || "Disabled by an administrator" : null,
      banExpires: null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, input.userId))
    .returning({ id: user.id });

  if (input.suspended) {
    await db.delete(session).where(eq(session.userId, input.userId));
  }

  return updated;
}

export async function setManagedUserGenerationLimit(
  userId: string,
  generationLimit: number | null,
) {
  const [updated] = await db
    .update(user)
    .set({ generationLimit, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning({ id: user.id });

  return updated;
}
