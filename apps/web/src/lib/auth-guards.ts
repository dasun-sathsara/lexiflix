import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect, unauthorized } from "next/navigation";

import { auth, isAdminEmail, type Session } from "@/lib/auth";
import { db } from "@/lib/server/db";
import { user } from "@/lib/server/db/schema";

async function syncAdminRoleIfNeeded(session: Session | null): Promise<Session | null> {
  if (!session?.user?.email || !isAdminEmail(session.user.email) || session.user.role === "admin") {
    return session;
  }

  await db
    .update(user)
    .set({
      role: "admin",
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id));

  return {
    ...session,
    user: {
      ...session.user,
      role: "admin" as const,
    },
  };
}

export async function getSessionOrNull() {
  const session = (await auth.api.getSession({ headers: await headers() })) as Session | null;
  return syncAdminRoleIfNeeded(session);
}

export async function getSessionFromRequestHeaders(requestHeaders: Headers) {
  const session = (await auth.api.getSession({ headers: requestHeaders })) as Session | null;
  return syncAdminRoleIfNeeded(session);
}

export async function requireSession() {
  const session = await getSessionOrNull();

  if (!session?.user) {
    unauthorized();
  }

  return session;
}

export async function requireAdmin() {
  const session = await requireSession();

  if (session.user.role !== "admin") {
    redirect("/forbidden");
  }

  return session;
}
