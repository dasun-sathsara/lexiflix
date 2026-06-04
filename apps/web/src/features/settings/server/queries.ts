import "server-only";

import { eq } from "drizzle-orm";

import type { SettingsPreferences } from "@/features/settings/types";
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
