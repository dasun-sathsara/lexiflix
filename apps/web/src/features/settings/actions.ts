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
import type {
  UpdateProfileActionResult,
  UpdateSettingsPreferencesActionResult,
} from "@/features/settings/types";
import type { ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/auth-guards";
import { CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH } from "@/lib/server/content-generation/contracts";
import { db } from "@/lib/server/db";
import { cefrProfile, userPreferences } from "@/lib/server/db/schema";
import { deleteObjectByKey, getKeyFromUrl, uploadUserAvatar } from "@/lib/storage/r2";

type UpdateUserBody = Parameters<typeof auth.api.updateUser>[0]["body"];

const profileSchema = z.object({
  name: z
    .string({ message: "Display name is required." })
    .trim()
    .min(2, "Use at least 2 characters for your display name.")
    .max(80, "Display name must be 80 characters or fewer."),
  removeAvatar: z.boolean().optional(),
});

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

export async function updateProfileAction(formData: FormData): Promise<UpdateProfileActionResult> {
  const session = await requireSession();
  const requestHeaders = await headers();
  const rawName = formData.get("name");
  const removeAvatarRaw = formData.get("removeAvatar");
  const avatarEntry = formData.get("avatar");

  const parsed = profileSchema.safeParse({
    name: typeof rawName === "string" ? rawName : "",
    removeAvatar: typeof removeAvatarRaw === "string" ? removeAvatarRaw === "true" : undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { name, removeAvatar } = parsed.data;
  const currentUser = session.user;
  const updates: { name?: string; image?: string | null } = {};

  if (name !== currentUser.name) {
    updates.name = name;
  }

  const avatarFile = avatarEntry instanceof File && avatarEntry.size > 0 ? avatarEntry : null;
  let uploadedKey: string | null = null;
  let oldKey: string | null = null;

  if (avatarFile) {
    try {
      const result = await uploadUserAvatar({
        userId: currentUser.id,
        file: avatarFile,
      });
      uploadedKey = result.key;
      updates.image = result.url;
      oldKey = getKeyFromUrl(currentUser.image ?? null);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to upload profile photo.",
      };
    }
  } else if (removeAvatar && currentUser.image) {
    updates.image = null;
    oldKey = getKeyFromUrl(currentUser.image);
  }

  if (!Object.keys(updates).length) {
    return {
      ok: true,
      data: {
        user: {
          name: currentUser.name,
          image: currentUser.image ?? null,
        },
      },
    };
  }

  try {
    await auth.api.updateUser({
      body: updates as UpdateUserBody,
      headers: requestHeaders,
    });

    if (oldKey) {
      await deleteObjectByKey(oldKey).catch((error) => {
        console.error("Failed to delete previous avatar", { error, oldKey });
      });
    }

    revalidatePath("/settings");

    return {
      ok: true,
      data: {
        user: {
          name: updates.name ?? currentUser.name,
          image: updates.image === undefined ? (currentUser.image ?? null) : updates.image,
        },
      },
    };
  } catch (error) {
    if (uploadedKey) {
      await deleteObjectByKey(uploadedKey).catch((cleanupError) => {
        console.error("Failed to clean up uploaded avatar after error", {
          error: cleanupError,
          uploadedKey,
        });
      });
    }

    if (error instanceof APIError) {
      return {
        ok: false,
        error: error.message,
      };
    }

    console.error("Unexpected error updating profile", { error });
    return {
      ok: false,
      error: "Failed to update profile.",
    };
  }
}

export async function updateSettingsPreferencesAction(
  input: z.input<typeof updateSettingsPreferencesSchema>,
): Promise<UpdateSettingsPreferencesActionResult> {
  const session = await requireSession();
  const parsed = updateSettingsPreferencesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid preferences.",
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
    ok: true,
    data: {
      preferences: await getSettingsPreferences(session.user.id),
    },
  };
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  try {
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });

    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        ok: false,
        error: error.message ?? "Unable to update password.",
      };
    }

    console.error("Unexpected error updating password", { error });
    return {
      ok: false,
      error: "Unexpected error updating password.",
    };
  }
}

export async function deleteAccountAction(): Promise<ActionResult> {
  try {
    await auth.api.deleteUser({
      body: {},
      headers: await headers(),
    });

    return { ok: true, data: undefined };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        ok: false,
        error: error.message ?? "Unable to delete account.",
      };
    }

    console.error("Unexpected error deleting account", { error });
    return {
      ok: false,
      error: "Unexpected error deleting account.",
    };
  }
}
