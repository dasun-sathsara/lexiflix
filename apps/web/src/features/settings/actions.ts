"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { CEFR_LEVELS } from "@/features/assessment/lib/types";
import {
  FREQUENCY_PREFERENCES,
  GENERATION_CEFR_WINDOW_MODES,
  GENERATION_KNOWN_TERM_HANDLINGS,
  getSettingsPreferences,
  STUDY_VOCABULARY_TYPES,
  settingsPreferenceDefaults,
} from "@/features/settings/server/preferences";
import type { UpdateSettingsPreferencesActionResult } from "@/features/settings/types";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/auth-guards";
import { CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH } from "@/lib/server/content-generation/contracts";
import { db } from "@/lib/server/db";
import { cefrProfile, userPreferences } from "@/lib/server/db/schema";

type ActionResponse =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
    };

const updateSettingsPreferencesSchema = z.object({
  manualOverrideLevel: z.enum(CEFR_LEVELS).nullable(),
  dailyWordsGoal: z.number().int().min(1).max(500),
  frequencyPreference: z.enum(FREQUENCY_PREFERENCES),
  studyVocabularyTypes: z.array(z.enum(STUDY_VOCABULARY_TYPES)).min(1),
  generationPackSizeDefault: z.number().int().min(1).max(100),
  generationCefrWindowMode: z.enum(GENERATION_CEFR_WINDOW_MODES),
  generationKnownTermHandling: z.enum(GENERATION_KNOWN_TERM_HANDLINGS),
  generationExampleSentenceCount: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  generationCustomInstructionsDefault: z
    .string()
    .trim()
    .max(CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH)
    .nullable()
    .transform((value) => value || null),
  emailRemindersEnabled: z.boolean(),
  streakAlertsEnabled: z.boolean(),
});

export async function updateSettingsPreferencesAction(
  input: z.input<typeof updateSettingsPreferencesSchema>,
): Promise<UpdateSettingsPreferencesActionResult> {
  const session = await requireSession();
  const parsed = updateSettingsPreferencesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid preferences.",
    };
  }

  const {
    manualOverrideLevel,
    dailyWordsGoal,
    frequencyPreference,
    studyVocabularyTypes,
    generationPackSizeDefault,
    generationCefrWindowMode,
    generationKnownTermHandling,
    generationExampleSentenceCount,
    generationCustomInstructionsDefault,
    emailRemindersEnabled,
    streakAlertsEnabled,
  } = parsed.data;
  const now = new Date();

  await db
    .insert(userPreferences)
    .values({
      userId: session.user.id,
      studyLanguageCode: settingsPreferenceDefaults.studyLanguageCode,
      dailyWordsGoal,
      frequencyPreference,
      studyVocabularyTypes,
      generationPackSizeDefault,
      generationCefrWindowMode,
      generationKnownTermHandling,
      generationExampleSentenceCount,
      generationCustomInstructionsDefault,
      emailRemindersEnabled,
      streakAlertsEnabled,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        studyLanguageCode: settingsPreferenceDefaults.studyLanguageCode,
        dailyWordsGoal,
        frequencyPreference,
        studyVocabularyTypes,
        generationPackSizeDefault,
        generationCefrWindowMode,
        generationKnownTermHandling,
        generationExampleSentenceCount,
        generationCustomInstructionsDefault,
        emailRemindersEnabled,
        streakAlertsEnabled,
        updatedAt: now,
      },
    });

  await db
    .insert(cefrProfile)
    .values({
      userId: session.user.id,
      manualOverrideLevel,
      manualOverrideAt: manualOverrideLevel ? now : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cefrProfile.userId,
      set: {
        manualOverrideLevel,
        manualOverrideAt: manualOverrideLevel ? now : null,
        updatedAt: now,
      },
    });

  revalidatePath("/settings");
  revalidatePath("/media");
  revalidatePath("/dashboard");
  revalidatePath("/decks");

  return {
    success: true,
    preferences: await getSettingsPreferences(session.user.id),
  };
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResponse> {
  try {
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });

    return { success: true };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message ?? "Unable to update password.",
      };
    }

    console.error("Unexpected error updating password", { error });
    return {
      success: false,
      message: "Unexpected error updating password.",
    };
  }
}

export async function deleteAccountAction(): Promise<ActionResponse> {
  try {
    await auth.api.deleteUser({
      body: {},
      headers: await headers(),
    });

    return { success: true };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message ?? "Unable to delete account.",
      };
    }

    console.error("Unexpected error deleting account", { error });
    return {
      success: false,
      message: "Unexpected error deleting account.",
    };
  }
}
