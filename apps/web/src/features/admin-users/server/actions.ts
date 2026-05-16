"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getManagedUser,
  setManagedUserGenerationLimit,
  setManagedUserSuspended,
} from "@/features/admin-users/server/queries";
import { requireAdmin } from "@/lib/auth/guards";
import { isAdminEmail } from "@/lib/auth/server";
import type { ActionResult } from "@/lib/contracts/action-result";

const suspensionSchema = z.object({
  userId: z.string().min(1),
  suspended: z.boolean(),
  reason: z.string().trim().max(200).optional(),
});

const generationLimitSchema = z.object({
  userId: z.string().min(1),
  generationLimit: z.number().int().min(0).max(1_000_000).nullable(),
});

export async function setUserSuspendedAction(
  input: z.input<typeof suspensionSchema>,
): Promise<ActionResult> {
  const adminSession = await requireAdmin();
  const parsed = suspensionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid account update." };
  }

  if (parsed.data.userId === adminSession.user.id) {
    return { ok: false, error: "You cannot disable your own account." };
  }

  const target = await getManagedUser(parsed.data.userId);
  if (!target) return { ok: false, error: "User account was not found." };
  if (target.role === "admin" || isAdminEmail(target.email)) {
    return { ok: false, error: "Admin accounts cannot be disabled from this page." };
  }

  await setManagedUserSuspended(parsed.data);
  revalidatePath("/admin/users");
  return { ok: true, data: undefined };
}

export async function setUserGenerationLimitAction(
  input: z.input<typeof generationLimitSchema>,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = generationLimitSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid generation limit." };
  }

  const target = await getManagedUser(parsed.data.userId);
  if (!target) return { ok: false, error: "User account was not found." };

  await setManagedUserGenerationLimit(parsed.data.userId, parsed.data.generationLimit);
  revalidatePath("/admin/users");
  return { ok: true, data: undefined };
}
