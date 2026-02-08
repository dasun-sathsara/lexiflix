import type { CefrLevel } from "@/features/assessment/lib/types";

export type SettingsPreferences = {
  assessedLevel: CefrLevel | null;
  manualOverrideLevel: CefrLevel | null;
  targetLanguage: string;
  dailyWordsGoal: number;
  emailRemindersEnabled: boolean;
  streakAlertsEnabled: boolean;
};
