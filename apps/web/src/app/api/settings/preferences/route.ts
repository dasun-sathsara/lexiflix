import { NextResponse } from "next/server";
import { z } from "zod";

import { CEFR_LEVELS } from "@/features/assessment/lib/types";
import {
  getSettingsPreferences,
  settingsPreferenceDefaults,
} from "@/features/settings/server/preferences";
import type { SettingsPreferences } from "@/features/settings/types";
import { auth } from "@/lib/auth";
import { db } from "@/lib/server/db";
import { cefrProfile, userPreferences } from "@/lib/server/db/schema";

const preferencesSchema = z.object({
  manualOverrideLevel: z.enum(CEFR_LEVELS).nullable(),
  dailyWordsGoal: z.number().int().min(1).max(500),
  emailRemindersEnabled: z.boolean(),
  streakAlertsEnabled: z.boolean(),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = preferencesSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { manualOverrideLevel, dailyWordsGoal, emailRemindersEnabled, streakAlertsEnabled } =
    parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .insert(userPreferences)
      .values({
        userId: session.user.id,
        targetLanguage: settingsPreferenceDefaults.targetLanguage,
        dailyWordsGoal,
        emailRemindersEnabled,
        streakAlertsEnabled,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          targetLanguage: settingsPreferenceDefaults.targetLanguage,
          dailyWordsGoal,
          emailRemindersEnabled,
          streakAlertsEnabled,
        },
      });

    await tx
      .insert(cefrProfile)
      .values({
        userId: session.user.id,
        manualOverrideLevel,
        manualOverrideAt: manualOverrideLevel ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: cefrProfile.userId,
        set: {
          manualOverrideLevel,
          manualOverrideAt: manualOverrideLevel ? new Date() : null,
        },
      });
  });

  const preferences: SettingsPreferences = await getSettingsPreferences(session.user.id);

  return NextResponse.json({
    success: true,
    preferences,
  });
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await getSettingsPreferences(session.user.id);

  return NextResponse.json({
    success: true,
    preferences,
  });
}
