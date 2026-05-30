import { eq } from "drizzle-orm";

import { CEFR_LEVELS, type CefrLevel } from "@/features/assessment/lib/types";
import type { SettingsPreferences } from "@/features/settings/types";
import {
  CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH,
  vocabularyKinds,
} from "@/lib/server/content-generation/contracts";
import { db } from "@/lib/server/db";
import type {
  GenerationAudioVoiceGender,
  GenerationCefrWindowMode,
  GenerationKnownTermHandling,
  StoredFrequencyPreference,
  StoredVocabularyKind,
} from "@/lib/server/db/json-contracts";
import { cefrProfile, userPreferences } from "@/lib/server/db/schema";

const DEFAULT_STUDY_LANGUAGE_CODE = "en";
const DEFAULT_TARGET_LANGUAGE = "English";
const DEFAULT_NEW_CARDS_PER_DAY = 20;
const DEFAULT_FREQUENCY_PREFERENCE: StoredFrequencyPreference = "balanced";
const DEFAULT_STUDY_VOCABULARY_TYPES: StoredVocabularyKind[] = [...vocabularyKinds];
const DEFAULT_GENERATION_PACK_SIZE = 20;
const DEFAULT_GENERATION_CEFR_WINDOW_MODE: GenerationCefrWindowMode = "same_level";
const DEFAULT_GENERATION_KNOWN_TERM_HANDLING: GenerationKnownTermHandling = "exclude_known";
const DEFAULT_GENERATION_AUDIO_VOICE_GENDER: GenerationAudioVoiceGender = "female";
const DEFAULT_GENERATION_EXAMPLE_SENTENCE_COUNT: 1 | 2 | 3 = 1;
const DEFAULT_GENERATION_CUSTOM_INSTRUCTIONS = null;
const DEFAULT_EMAIL_REMINDERS_ENABLED = true;
const DEFAULT_STREAK_ALERTS_ENABLED = true;

export const GENERATION_CEFR_WINDOW_MODES = [
  "same_level",
  "one_level_above",
  "all_levels_above",
] as const satisfies readonly GenerationCefrWindowMode[];

export const GENERATION_KNOWN_TERM_HANDLINGS = [
  "exclude_known",
  "downrank_known",
  "include_known",
] as const satisfies readonly GenerationKnownTermHandling[];

export const GENERATION_AUDIO_VOICE_GENDERS = [
  "female",
  "male",
] as const satisfies readonly GenerationAudioVoiceGender[];

export const FREQUENCY_PREFERENCES = [
  "balanced",
  "common_first",
  "challenge_first",
] as const satisfies readonly StoredFrequencyPreference[];

export const STUDY_VOCABULARY_TYPES = [
  ...vocabularyKinds,
] as const satisfies readonly StoredVocabularyKind[];

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
  return normalized.length > 0 ? normalized : DEFAULT_STUDY_VOCABULARY_TYPES;
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
  const [profile, preferences] = await Promise.all([
    db
      .select({
        assessedLevel: cefrProfile.assessedLevel,
        manualOverrideLevel: cefrProfile.manualOverrideLevel,
      })
      .from(cefrProfile)
      .where(eq(cefrProfile.userId, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
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
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  return {
    assessedLevel: toCefrLevel(profile?.assessedLevel),
    manualOverrideLevel: toCefrLevel(profile?.manualOverrideLevel),
    targetLanguage: studyLanguageLabel(
      preferences?.studyLanguageCode ?? DEFAULT_STUDY_LANGUAGE_CODE,
    ),
    newCardsPerDay: preferences?.newCardsPerDay ?? DEFAULT_NEW_CARDS_PER_DAY,
    frequencyPreference: isFrequencyPreference(preferences?.frequencyPreference)
      ? preferences.frequencyPreference
      : DEFAULT_FREQUENCY_PREFERENCE,
    studyVocabularyTypes: normalizeVocabularyTypes(preferences?.studyVocabularyTypes),
    generationPackSizeDefault: normalizePackSize(preferences?.generationPackSizeDefault),
    generationCefrWindowMode: isCefrWindowMode(preferences?.generationCefrWindowMode)
      ? preferences.generationCefrWindowMode
      : DEFAULT_GENERATION_CEFR_WINDOW_MODE,
    generationKnownTermHandling: isKnownTermHandling(preferences?.generationKnownTermHandling)
      ? preferences.generationKnownTermHandling
      : DEFAULT_GENERATION_KNOWN_TERM_HANDLING,
    generationAudioVoiceGenderDefault: isAudioVoiceGender(
      preferences?.generationAudioVoiceGenderDefault,
    )
      ? preferences.generationAudioVoiceGenderDefault
      : DEFAULT_GENERATION_AUDIO_VOICE_GENDER,
    generationExampleSentenceCount: normalizeExampleSentenceCount(
      preferences?.generationExampleSentenceCount,
    ),
    generationCustomInstructionsDefault: normalizeCustomInstructions(
      preferences?.generationCustomInstructionsDefault,
    ),
    emailRemindersEnabled: preferences?.emailRemindersEnabled ?? DEFAULT_EMAIL_REMINDERS_ENABLED,
    streakAlertsEnabled: preferences?.streakAlertsEnabled ?? DEFAULT_STREAK_ALERTS_ENABLED,
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
