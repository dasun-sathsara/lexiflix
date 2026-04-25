import type { CefrLevel } from "@/features/assessment/lib/types";
import type { ActionResult } from "@/lib/action-result";
import type {
  GenerationCefrWindowMode,
  GenerationKnownTermHandling,
  StoredFrequencyPreference,
  StoredVocabularyKind,
} from "@/lib/server/db/json-contracts";

export type SettingsPreferences = {
  assessedLevel: CefrLevel | null;
  manualOverrideLevel: CefrLevel | null;
  targetLanguage: string;
  dailyWordsGoal: number;
  frequencyPreference: StoredFrequencyPreference;
  studyVocabularyTypes: StoredVocabularyKind[];
  generationPackSizeDefault: number;
  generationCefrWindowMode: GenerationCefrWindowMode;
  generationKnownTermHandling: GenerationKnownTermHandling;
  generationExampleSentenceCount: 1 | 2 | 3;
  generationCustomInstructionsDefault: string | null;
  emailRemindersEnabled: boolean;
  streakAlertsEnabled: boolean;
};

export type UpdateSettingsPreferencesActionResult = ActionResult<{
  preferences: SettingsPreferences;
}>;

export type UpdateProfileActionResult = ActionResult<{
  user: {
    name: string;
    image: string | null;
  };
}>;
