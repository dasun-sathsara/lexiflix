import { headers } from "next/headers";
import { redirect, unauthorized } from "next/navigation";

import { auth } from "@/lib/auth";

export async function getSessionOrNull() {
  return auth.api.getSession({ headers: await headers() });
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
