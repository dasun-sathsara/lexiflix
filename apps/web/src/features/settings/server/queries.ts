import "server-only";

import { eq } from "drizzle-orm";

import type {
  AiServiceProviderView,
  AiServicesSettings,
  SettingsPreferences,
} from "@/features/settings/types";
import {
  CEFR_LEVELS,
  type CefrLevel,
  CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH,
  DEFAULT_EMAIL_REMINDERS_ENABLED,
  DEFAULT_FREQUENCY_PREFERENCE,
  DEFAULT_GENERATION_AUDIO_VOICE_GENDER,
  DEFAULT_GENERATION_CEFR_WINDOW_MODE,
  DEFAULT_GENERATION_CUSTOM_INSTRUCTIONS,
  DEFAULT_GENERATION_EXAMPLE_SENTENCE_COUNT,
  DEFAULT_GENERATION_KNOWN_TERM_HANDLING,
  DEFAULT_GENERATION_PACK_SIZE,
  DEFAULT_NEW_CARDS_PER_DAY,
  DEFAULT_STREAK_ALERTS_ENABLED,
  DEFAULT_STUDY_LANGUAGE_CODE,
  DEFAULT_STUDY_VOCABULARY_TYPES,
  DEFAULT_TARGET_LANGUAGE,
  FREQUENCY_PREFERENCES,
  GENERATION_AUDIO_VOICE_GENDERS,
  GENERATION_CEFR_WINDOW_MODES,
  GENERATION_KNOWN_TERM_HANDLINGS,
  STUDY_VOCABULARY_TYPES,
} from "@/lib/constants";
import { isAiCredentialEncryptionAvailable } from "@/lib/server/ai-credentials/encryption-key";
import { chooseCredentialSource } from "@/lib/server/ai-credentials/policy";
import {
  getEnforceSystemCredentials,
  listUserAiCredentials,
} from "@/lib/server/ai-credentials/store";
import { getSystemCredentialAvailability } from "@/lib/server/ai-credentials/system";
import {
  AI_PROVIDER_IDS,
  AI_PROVIDER_LABELS,
  type AiProviderId,
  type StoredAiCredential,
} from "@/lib/server/ai-credentials/types";
import { db } from "@/lib/server/db";
import type {
  GenerationAudioVoiceGender,
  GenerationCefrWindowMode,
  GenerationKnownTermHandling,
  StoredFrequencyPreference,
  StoredVocabularyKind,
} from "@/lib/server/db/json-contracts";
import { cefrProfile, user, userPreferences } from "@/lib/server/db/schema";

export {
  FREQUENCY_PREFERENCES,
  GENERATION_AUDIO_VOICE_GENDERS,
  GENERATION_CEFR_WINDOW_MODES,
  GENERATION_KNOWN_TERM_HANDLINGS,
  STUDY_VOCABULARY_TYPES,
};

const STUDY_LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
};

function toCefrLevel(value: string | null | undefined): CefrLevel | null {
  if (!value) {
    return null;
  }

  return CEFR_LEVELS.includes(value as CefrLevel) ? (value as CefrLevel) : null;
}

function studyLanguageLabel(code: string | null | undefined) {
  if (!code) {
    return DEFAULT_TARGET_LANGUAGE;
  }

  return STUDY_LANGUAGE_LABELS[code] ?? code;
}

function isFrequencyPreference(
  value: string | null | undefined,
): value is StoredFrequencyPreference {
  return FREQUENCY_PREFERENCES.includes(value as StoredFrequencyPreference);
}

function isVocabularyKind(value: string): value is StoredVocabularyKind {
  return STUDY_VOCABULARY_TYPES.includes(value as StoredVocabularyKind);
}

function isCefrWindowMode(value: string | null | undefined): value is GenerationCefrWindowMode {
  return GENERATION_CEFR_WINDOW_MODES.includes(value as GenerationCefrWindowMode);
}

function isKnownTermHandling(
  value: string | null | undefined,
): value is GenerationKnownTermHandling {
  return GENERATION_KNOWN_TERM_HANDLINGS.includes(value as GenerationKnownTermHandling);
}

function isAudioVoiceGender(value: string | null | undefined): value is GenerationAudioVoiceGender {
  return GENERATION_AUDIO_VOICE_GENDERS.includes(value as GenerationAudioVoiceGender);
}

function normalizeVocabularyTypes(values: string[] | null | undefined): StoredVocabularyKind[] {
  const normalized = Array.from(new Set((values ?? []).filter(isVocabularyKind)));
  return normalized.length > 0 ? normalized : [...DEFAULT_STUDY_VOCABULARY_TYPES];
}

function normalizeExampleSentenceCount(value: number | null | undefined): 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3
    ? value
    : DEFAULT_GENERATION_EXAMPLE_SENTENCE_COUNT;
}

function normalizePackSize(value: number | null | undefined) {
  if (!Number.isInteger(value)) {
    return DEFAULT_GENERATION_PACK_SIZE;
  }

  return Math.max(1, value ?? DEFAULT_GENERATION_PACK_SIZE);
}

function normalizeCustomInstructions(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return DEFAULT_GENERATION_CUSTOM_INSTRUCTIONS;
  }

  return trimmed.slice(0, CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH);
}

export async function getSettingsPreferences(userId: string): Promise<SettingsPreferences> {
  const [row] = await db
    .select({
      assessedLevel: cefrProfile.assessedLevel,
      manualOverrideLevel: cefrProfile.manualOverrideLevel,
      studyLanguageCode: userPreferences.studyLanguageCode,
      newCardsPerDay: userPreferences.newCardsPerDay,
      frequencyPreference: userPreferences.frequencyPreference,
      studyVocabularyTypes: userPreferences.studyVocabularyTypes,
      generationPackSizeDefault: userPreferences.generationPackSizeDefault,
      generationCefrWindowMode: userPreferences.generationCefrWindowMode,
      generationKnownTermHandling: userPreferences.generationKnownTermHandling,
      generationAudioVoiceGenderDefault: userPreferences.generationAudioVoiceGenderDefault,
      generationExampleSentenceCount: userPreferences.generationExampleSentenceCount,
      generationCustomInstructionsDefault: userPreferences.generationCustomInstructionsDefault,
      emailRemindersEnabled: userPreferences.emailRemindersEnabled,
      streakAlertsEnabled: userPreferences.streakAlertsEnabled,
    })
    .from(user)
    .leftJoin(userPreferences, eq(userPreferences.userId, user.id))
    .leftJoin(cefrProfile, eq(cefrProfile.userId, user.id))
    .where(eq(user.id, userId))
    .limit(1);

  return {
    assessedLevel: toCefrLevel(row?.assessedLevel),
    manualOverrideLevel: toCefrLevel(row?.manualOverrideLevel),
    targetLanguage: studyLanguageLabel(row?.studyLanguageCode ?? DEFAULT_STUDY_LANGUAGE_CODE),
    newCardsPerDay: row?.newCardsPerDay ?? DEFAULT_NEW_CARDS_PER_DAY,
    frequencyPreference: isFrequencyPreference(row?.frequencyPreference)
      ? row.frequencyPreference
      : DEFAULT_FREQUENCY_PREFERENCE,
    studyVocabularyTypes: normalizeVocabularyTypes(row?.studyVocabularyTypes),
    generationPackSizeDefault: normalizePackSize(row?.generationPackSizeDefault),
    generationCefrWindowMode: isCefrWindowMode(row?.generationCefrWindowMode)
      ? row.generationCefrWindowMode
      : DEFAULT_GENERATION_CEFR_WINDOW_MODE,
    generationKnownTermHandling: isKnownTermHandling(row?.generationKnownTermHandling)
      ? row.generationKnownTermHandling
      : DEFAULT_GENERATION_KNOWN_TERM_HANDLING,
    generationAudioVoiceGenderDefault: isAudioVoiceGender(row?.generationAudioVoiceGenderDefault)
      ? row.generationAudioVoiceGenderDefault
      : DEFAULT_GENERATION_AUDIO_VOICE_GENDER,
    generationExampleSentenceCount: normalizeExampleSentenceCount(
      row?.generationExampleSentenceCount,
    ),
    generationCustomInstructionsDefault: normalizeCustomInstructions(
      row?.generationCustomInstructionsDefault,
    ),
    emailRemindersEnabled: row?.emailRemindersEnabled ?? DEFAULT_EMAIL_REMINDERS_ENABLED,
    streakAlertsEnabled: row?.streakAlertsEnabled ?? DEFAULT_STREAK_ALERTS_ENABLED,
  };
}

export const settingsPreferenceDefaults = {
  studyLanguageCode: DEFAULT_STUDY_LANGUAGE_CODE,
  targetLanguage: DEFAULT_TARGET_LANGUAGE,
  newCardsPerDay: DEFAULT_NEW_CARDS_PER_DAY,
  frequencyPreference: DEFAULT_FREQUENCY_PREFERENCE,
  studyVocabularyTypes: DEFAULT_STUDY_VOCABULARY_TYPES,
  generationPackSizeDefault: DEFAULT_GENERATION_PACK_SIZE,
  generationCefrWindowMode: DEFAULT_GENERATION_CEFR_WINDOW_MODE,
  generationKnownTermHandling: DEFAULT_GENERATION_KNOWN_TERM_HANDLING,
  generationAudioVoiceGenderDefault: DEFAULT_GENERATION_AUDIO_VOICE_GENDER,
  generationExampleSentenceCount: DEFAULT_GENERATION_EXAMPLE_SENTENCE_COUNT,
  generationCustomInstructionsDefault: DEFAULT_GENERATION_CUSTOM_INSTRUCTIONS,
  emailRemindersEnabled: DEFAULT_EMAIL_REMINDERS_ENABLED,
  streakAlertsEnabled: DEFAULT_STREAK_ALERTS_ENABLED,
} as const;

// ---------------------------------------------------------------------------
// AI services (bring-your-own credentials)
// ---------------------------------------------------------------------------

/** A stored credential is only usable when the provider-specific required fields are present. */
function hasRequiredCredentialFields(provider: AiProviderId, row: StoredAiCredential): boolean {
  switch (provider) {
    case "azure-foundry":
      return Boolean(row.metadata.endpoint);
    case "aws-polly":
      return Boolean(row.metadata.accessKeyId);
    default:
      return true;
  }
}

/**
 * Read model for the AI services settings tab. Secrets are never returned — only a masked
 * hint plus non-secret configuration such as endpoints and regions.
 */
export async function getAiServicesSettings(input: {
  userId: string;
  isAdmin: boolean;
}): Promise<AiServicesSettings> {
  const [enforceSystemCredentials, rows] = await Promise.all([
    getEnforceSystemCredentials(),
    listUserAiCredentials(input.userId),
  ]);

  const systemAvailability = getSystemCredentialAvailability();
  const byProvider = new Map(rows.map((row) => [row.provider, row]));

  const providers: AiServiceProviderView[] = AI_PROVIDER_IDS.map((provider) => {
    const row = byProvider.get(provider);
    const usable =
      Boolean(row?.enabled) && Boolean(row && hasRequiredCredentialFields(provider, row));

    return {
      provider,
      label: AI_PROVIDER_LABELS[provider],
      configured: Boolean(row),
      secretHint: row?.secretHint ?? null,
      enabled: row?.enabled ?? false,
      metadata: row?.metadata ?? {},
      systemConfigured: systemAvailability[provider],
      effectiveSource: chooseCredentialSource({
        enforceSystemCredentials,
        hasUsableUserCredential: usable,
      }),
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  });

  return {
    enforceSystemCredentials,
    isAdmin: input.isAdmin,
    encryptionAvailable: isAiCredentialEncryptionAvailable(),
    providers,
  };
}
