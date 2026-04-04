import { eq } from "drizzle-orm";

import { CEFR_LEVELS, type CefrLevel } from "@/features/assessment/lib/types";
import type { SettingsPreferences } from "@/features/settings/types";
import { db } from "@/lib/server/db";
import { cefrProfile, userPreferences } from "@/lib/server/db/schema";

const DEFAULT_STUDY_LANGUAGE_CODE = "en";
const DEFAULT_TARGET_LANGUAGE = "English";
const DEFAULT_DAILY_WORDS_GOAL = 20;
const DEFAULT_EMAIL_REMINDERS_ENABLED = true;
const DEFAULT_STREAK_ALERTS_ENABLED = true;

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
        dailyWordsGoal: userPreferences.dailyWordsGoal,
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
    dailyWordsGoal: preferences?.dailyWordsGoal ?? DEFAULT_DAILY_WORDS_GOAL,
    emailRemindersEnabled: preferences?.emailRemindersEnabled ?? DEFAULT_EMAIL_REMINDERS_ENABLED,
    streakAlertsEnabled: preferences?.streakAlertsEnabled ?? DEFAULT_STREAK_ALERTS_ENABLED,
  };
}

export const settingsPreferenceDefaults = {
  studyLanguageCode: DEFAULT_STUDY_LANGUAGE_CODE,
  targetLanguage: DEFAULT_TARGET_LANGUAGE,
  dailyWordsGoal: DEFAULT_DAILY_WORDS_GOAL,
  emailRemindersEnabled: DEFAULT_EMAIL_REMINDERS_ENABLED,
  streakAlertsEnabled: DEFAULT_STREAK_ALERTS_ENABLED,
} as const;
