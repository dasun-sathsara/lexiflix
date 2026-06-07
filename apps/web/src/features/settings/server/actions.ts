"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import {
  FREQUENCY_PREFERENCES,
  GENERATION_AUDIO_VOICE_GENDERS,
  GENERATION_CEFR_WINDOW_MODES,
  GENERATION_KNOWN_TERM_HANDLINGS,
  getAiServicesSettings,
  getSettingsPreferences,
  STUDY_VOCABULARY_TYPES,
  settingsPreferenceDefaults,
} from "@/features/settings/server/queries";
import {
  type AiServiceCredentialInput,
  type AiServicesSettingsActionResult,
  aiServiceCredentialSchema,
  type UpdateProfileActionResult,
  type UpdateSettingsPreferencesActionResult,
} from "@/features/settings/types";
import { requireAdmin, requireSession } from "@/lib/auth/guards";
import { auth, type Session } from "@/lib/auth/server";
import { CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH } from "@/lib/constants";
import type { ActionResult } from "@/lib/contracts/action-result";
import { CEFR_LEVELS } from "@/lib/domain/cefr";
import { deleteObjectByKey, getKeyFromUrl, uploadUserAvatar } from "@/lib/integrations/storage/r2";
import { getAiCredentialEncryptionKey } from "@/lib/server/ai-credentials/encryption-key";
import {
  deleteUserAiCredential,
  getEnforceSystemCredentials,
  setEnforceSystemCredentials,
  setUserAiCredentialEnabled,
  upsertUserAiCredential,
} from "@/lib/server/ai-credentials/store";
import {
  AI_PROVIDER_IDS,
  type AiCredentialMetadata,
  type AiProviderId,
} from "@/lib/server/ai-credentials/types";
import { db } from "@/lib/server/db";
import { cefrProfile, userPreferences } from "@/lib/server/db/schema";
import { encryptSecret, maskSecret } from "@/lib/server/security/secret-box";

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
  newCardsPerDay: z.number().int().min(1).max(100),
  frequencyPreference: z.enum(FREQUENCY_PREFERENCES),
  studyVocabularyTypes: z.array(z.enum(STUDY_VOCABULARY_TYPES)).min(1),
  generationPackSizeDefault: z.number().int().min(1),
  generationCefrWindowMode: z.enum(GENERATION_CEFR_WINDOW_MODES),
  generationKnownTermHandling: z.enum(GENERATION_KNOWN_TERM_HANDLINGS),
  generationAudioVoiceGenderDefault: z.enum(GENERATION_AUDIO_VOICE_GENDERS),
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
    newCardsPerDay,
    frequencyPreference,
    studyVocabularyTypes,
    generationPackSizeDefault,
    generationCefrWindowMode,
    generationKnownTermHandling,
    generationAudioVoiceGenderDefault,
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
      newCardsPerDay,
      frequencyPreference,
      studyVocabularyTypes,
      generationPackSizeDefault,
      generationCefrWindowMode,
      generationKnownTermHandling,
      generationAudioVoiceGenderDefault,
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
        newCardsPerDay,
        frequencyPreference,
        studyVocabularyTypes,
        generationPackSizeDefault,
        generationCefrWindowMode,
        generationKnownTermHandling,
        generationAudioVoiceGenderDefault,
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

// ---------------------------------------------------------------------------
// AI services (bring-your-own credentials)
// ---------------------------------------------------------------------------

const aiProviderIdSchema = z.enum(AI_PROVIDER_IDS);

/** Splits validated input into the encrypted secret and its non-secret metadata. */
function toCredentialParts(input: z.output<typeof aiServiceCredentialSchema>): {
  secret: string;
  metadata: AiCredentialMetadata;
} {
  switch (input.provider) {
    case "gemini":
      return { secret: input.apiKey, metadata: {} };
    case "azure-foundry":
      return {
        secret: input.apiKey,
        metadata: {
          endpoint: input.endpoint,
          model: input.model,
          imageModel: input.imageModel,
        },
      };
    case "aws-polly":
      return {
        secret: input.secretAccessKey,
        metadata: { accessKeyId: input.accessKeyId, region: input.region },
      };
    case "azure-mai":
      return { secret: input.apiKey, metadata: { region: input.region } };
  }
}

async function readAiServicesSettings(session: Session) {
  return getAiServicesSettings({
    userId: session.user.id,
    isAdmin: session.user.role === "admin",
  });
}

export async function saveAiServiceCredentialAction(
  input: AiServiceCredentialInput,
): Promise<AiServicesSettingsActionResult> {
  const session = await requireSession();
  const parsed = aiServiceCredentialSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid AI service credentials.",
    };
  }

  if (await getEnforceSystemCredentials()) {
    return {
      ok: false,
      error: "An administrator requires all AI generation to use the system configuration.",
    };
  }

  const { secret, metadata } = toCredentialParts(parsed.data);

  let secretCiphertext: string;
  try {
    secretCiphertext = encryptSecret(secret, getAiCredentialEncryptionKey());
  } catch (error) {
    console.error("Failed to encrypt AI service credential", { error });
    return { ok: false, error: "Credential storage is unavailable on this server." };
  }

  await upsertUserAiCredential({
    userId: session.user.id,
    provider: parsed.data.provider,
    secretCiphertext,
    secretHint: maskSecret(secret),
    metadata,
    enabled: true,
  });

  revalidatePath("/settings");

  return { ok: true, data: { aiServices: await readAiServicesSettings(session) } };
}

export async function deleteAiServiceCredentialAction(input: {
  provider: AiProviderId;
}): Promise<AiServicesSettingsActionResult> {
  const session = await requireSession();
  const parsed = aiProviderIdSchema.safeParse(input.provider);

  if (!parsed.success) {
    return { ok: false, error: "Unknown AI provider." };
  }

  await deleteUserAiCredential({ userId: session.user.id, provider: parsed.data });
  revalidatePath("/settings");

  return { ok: true, data: { aiServices: await readAiServicesSettings(session) } };
}

export async function setAiServiceCredentialEnabledAction(input: {
  provider: AiProviderId;
  enabled: boolean;
}): Promise<AiServicesSettingsActionResult> {
  const session = await requireSession();
  const parsed = z.object({ provider: aiProviderIdSchema, enabled: z.boolean() }).safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Invalid AI provider request." };
  }

  if (await getEnforceSystemCredentials()) {
    return {
      ok: false,
      error: "An administrator requires all AI generation to use the system configuration.",
    };
  }

  await setUserAiCredentialEnabled({
    userId: session.user.id,
    provider: parsed.data.provider,
    enabled: parsed.data.enabled,
  });
  revalidatePath("/settings");

  return { ok: true, data: { aiServices: await readAiServicesSettings(session) } };
}

/**
 * Admin-only: force every user onto the system `.env` AI configuration.
 * Other users see the change on their next settings page load.
 */
export async function setAiCredentialPolicyAction(input: {
  enforceSystemCredentials: boolean;
}): Promise<AiServicesSettingsActionResult> {
  const session = await requireAdmin();
  const parsed = z.object({ enforceSystemCredentials: z.boolean() }).safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Invalid enforcement value." };
  }

  await setEnforceSystemCredentials({
    enforceSystemCredentials: parsed.data.enforceSystemCredentials,
    updatedByUserId: session.user.id,
  });

  console.warn("[ai-credentials] enforcement policy changed", {
    enforceSystemCredentials: parsed.data.enforceSystemCredentials,
    updatedByUserId: session.user.id,
  });

  revalidatePath("/settings");

  return { ok: true, data: { aiServices: await readAiServicesSettings(session) } };
}
