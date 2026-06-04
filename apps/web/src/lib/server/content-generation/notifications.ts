import "server-only";

import { logger } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import {
  createPackFailedNotification,
  createPackReadyNotification,
} from "@/features/notifications/server/queries";
import { getSettingsPreferences } from "@/features/settings/server/queries";
import { env } from "@/lib/config/env";
import { sendPackStatusEmail } from "@/lib/email/sender";
import { db } from "@/lib/server/db";
import { user as userTable } from "@/lib/server/db/schema";

type PackStatus = "completed" | "failed";

/** Email delivery is best-effort: failures are logged and never fail the workflow. */
async function sendStatusEmailIfEnabled(input: {
  userId: string;
  status: PackStatus;
  packTitle: string;
  jobId: string;
  packId?: string;
}) {
  try {
    const [userRow, preferences] = await Promise.all([
      db.query.user.findFirst({ where: eq(userTable.id, input.userId) }),
      getSettingsPreferences(input.userId),
    ]);

    if (!userRow || !preferences.emailRemindersEnabled) {
      return;
    }

    const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const actionUrl =
      input.status === "completed" && input.packId
        ? `${baseUrl}/pack/${input.packId}`
        : `${baseUrl}/generation/${input.jobId}`;

    await sendPackStatusEmail({
      email: userRow.email,
      userName: userRow.name,
      status: input.status,
      packTitle: input.packTitle,
      actionUrl,
    });
  } catch (error) {
    logger.warn("[content-generation] failed to send pack status email", {
      jobId: input.jobId,
      status: input.status,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Throws when the in-app notification cannot be created, so callers can record a warning. */
export async function notifyPackReady(input: {
  userId: string;
  jobId: string;
  packId: string;
  packTitle: string;
}) {
  await createPackReadyNotification({
    userId: input.userId,
    jobId: input.jobId,
    packId: input.packId,
    title: input.packTitle,
  });
  await sendStatusEmailIfEnabled({ ...input, status: "completed" });
}

/** Throws when the in-app notification cannot be created, so callers can record a warning. */
export async function notifyPackFailed(input: {
  userId: string;
  jobId: string;
  packTitle: string;
}) {
  await createPackFailedNotification({
    userId: input.userId,
    jobId: input.jobId,
    title: input.packTitle,
  });
  await sendStatusEmailIfEnabled({ ...input, status: "failed" });
}
