import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { CefrLevel } from "@/features/assessment/types";
import { updateSettingsPreferencesAction } from "@/features/settings/server/actions";
import type {
  ManualOverrideSelection,
  SettingsPreferences,
  StatusState,
} from "@/features/settings/types";
import type { StoredVocabularyKind } from "@/lib/server/db/json-contracts";
import {
  CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH,
  getEffectiveCefrLevel,
  normalizeCustomInstructions,
} from "./utils";

export function usePreferencesForm(preferences: SettingsPreferences) {
  const router = useRouter();

  const [preferencesStatus, setPreferencesStatus] = useState<StatusState>(null);
  const [initialPreferences, setInitialPreferences] = useState(preferences);
  const [manualOverrideSelection, setManualOverrideSelection] = useState<ManualOverrideSelection>(
    preferences.manualOverrideLevel ?? "assessed",
  );
  const [newCardsPerDay, setNewCardsPerDay] = useState(String(preferences.newCardsPerDay));
  const [frequencyPreference, setFrequencyPreference] = useState(preferences.frequencyPreference);
  const [studyVocabularyTypes, setStudyVocabularyTypes] = useState(
    preferences.studyVocabularyTypes,
  );
  const [generationPackSizeDefault, setGenerationPackSizeDefault] = useState(
    String(preferences.generationPackSizeDefault),
  );
  const [generationCefrWindowMode, setGenerationCefrWindowMode] = useState(
    preferences.generationCefrWindowMode,
  );
  const [generationKnownTermHandling, setGenerationKnownTermHandling] = useState(
    preferences.generationKnownTermHandling,
  );
  const [generationAudioVoiceGenderDefault, setGenerationAudioVoiceGenderDefault] = useState(
    preferences.generationAudioVoiceGenderDefault,
  );
  const [generationExampleSentenceCount, setGenerationExampleSentenceCount] = useState(
    String(preferences.generationExampleSentenceCount),
  );
  const [generationCustomInstructionsDefault, setGenerationCustomInstructionsDefault] = useState(
    preferences.generationCustomInstructionsDefault ?? "",
  );
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(
    preferences.emailRemindersEnabled,
  );
  const [streakAlertsEnabled, setStreakAlertsEnabled] = useState(preferences.streakAlertsEnabled);

  const [isSavingPreferences, startSavingPreferences] = useTransition();

  const parsedNewCardsPerDay = Number.parseInt(newCardsPerDay, 10);
  const newCardsPerDayIsValid =
    Number.isInteger(parsedNewCardsPerDay) &&
    parsedNewCardsPerDay >= 1 &&
    parsedNewCardsPerDay <= 100;

  const parsedGenerationPackSize = Number.parseInt(generationPackSizeDefault, 10);
  const generationPackSizeIsValid =
    Number.isInteger(parsedGenerationPackSize) && parsedGenerationPackSize >= 1;

  const customInstructionsIsValid =
    generationCustomInstructionsDefault.trim().length <= CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH;

  const vocabularyTypesAreValid = studyVocabularyTypes.length > 0;

  const parsedGenerationExampleSentenceCount = Number.parseInt(generationExampleSentenceCount, 10);

  const normalizedCustomInstructions = normalizeCustomInstructions(
    generationCustomInstructionsDefault,
  );

  const manualOverrideLevel: CefrLevel | null =
    manualOverrideSelection === "assessed" ? null : manualOverrideSelection;

  const preferencesChanged =
    manualOverrideLevel !== initialPreferences.manualOverrideLevel ||
    parsedNewCardsPerDay !== initialPreferences.newCardsPerDay ||
    frequencyPreference !== initialPreferences.frequencyPreference ||
    [...studyVocabularyTypes].sort().join("|") !==
      [...initialPreferences.studyVocabularyTypes].sort().join("|") ||
    parsedGenerationPackSize !== initialPreferences.generationPackSizeDefault ||
    generationCefrWindowMode !== initialPreferences.generationCefrWindowMode ||
    generationKnownTermHandling !== initialPreferences.generationKnownTermHandling ||
    generationAudioVoiceGenderDefault !== initialPreferences.generationAudioVoiceGenderDefault ||
    parsedGenerationExampleSentenceCount !== initialPreferences.generationExampleSentenceCount ||
    normalizedCustomInstructions !== initialPreferences.generationCustomInstructionsDefault ||
    emailRemindersEnabled !== initialPreferences.emailRemindersEnabled ||
    streakAlertsEnabled !== initialPreferences.streakAlertsEnabled;

  const preferencesSubmitDisabled =
    isSavingPreferences ||
    !newCardsPerDayIsValid ||
    !generationPackSizeIsValid ||
    !(parsedGenerationExampleSentenceCount >= 1 && parsedGenerationExampleSentenceCount <= 3) ||
    !customInstructionsIsValid ||
    !vocabularyTypesAreValid ||
    !preferencesChanged;

  const effectiveCefrLevel = getEffectiveCefrLevel(
    manualOverrideLevel,
    initialPreferences.assessedLevel,
  );

  const toggleVocabularyType = (kind: StoredVocabularyKind, checked: boolean) => {
    if (checked) {
      setStudyVocabularyTypes(
        studyVocabularyTypes.includes(kind)
          ? studyVocabularyTypes
          : [...studyVocabularyTypes, kind],
      );
    } else {
      const next = studyVocabularyTypes.filter((value) => value !== kind);
      if (next.length > 0) {
        setStudyVocabularyTypes(next);
      }
    }
    setPreferencesStatus(null);
  };

  const handlePreferencesSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (preferencesSubmitDisabled) {
      return;
    }

    startSavingPreferences(async () => {
      try {
        const result = await updateSettingsPreferencesAction({
          manualOverrideLevel,
          newCardsPerDay: parsedNewCardsPerDay,
          frequencyPreference,
          studyVocabularyTypes,
          generationPackSizeDefault: parsedGenerationPackSize,
          generationCefrWindowMode,
          generationKnownTermHandling,
          generationAudioVoiceGenderDefault,
          generationExampleSentenceCount: parsedGenerationExampleSentenceCount as 1 | 2 | 3,
          generationCustomInstructionsDefault: normalizedCustomInstructions,
          emailRemindersEnabled,
          streakAlertsEnabled,
        });

        if (!result.ok) {
          setPreferencesStatus({ type: "error", message: result.error });
          toast.error(result.error);
          return;
        }

        const nextPreferences = result.data.preferences;
        setInitialPreferences(nextPreferences);
        setManualOverrideSelection(nextPreferences.manualOverrideLevel ?? "assessed");
        setNewCardsPerDay(String(nextPreferences.newCardsPerDay));
        setFrequencyPreference(nextPreferences.frequencyPreference);
        setStudyVocabularyTypes(nextPreferences.studyVocabularyTypes);
        setGenerationPackSizeDefault(String(nextPreferences.generationPackSizeDefault));
        setGenerationCefrWindowMode(nextPreferences.generationCefrWindowMode);
        setGenerationKnownTermHandling(nextPreferences.generationKnownTermHandling);
        setGenerationAudioVoiceGenderDefault(nextPreferences.generationAudioVoiceGenderDefault);
        setGenerationExampleSentenceCount(String(nextPreferences.generationExampleSentenceCount));
        setGenerationCustomInstructionsDefault(
          nextPreferences.generationCustomInstructionsDefault ?? "",
        );
        setEmailRemindersEnabled(nextPreferences.emailRemindersEnabled);
        setStreakAlertsEnabled(nextPreferences.streakAlertsEnabled);
        setPreferencesStatus({
          type: "success",
          message: "Preferences updated successfully.",
        });
        toast.success("Preferences updated");
        router.refresh();
      } catch (error) {
        console.error("Failed to update preferences", error);
        setPreferencesStatus({
          type: "error",
          message: "Failed to update preferences.",
        });
        toast.error("Failed to update preferences");
      }
    });
  };

  return {
    initialPreferences,
    manualOverrideSelection,
    setManualOverrideSelection,
    newCardsPerDay,
    setNewCardsPerDay,
    frequencyPreference,
    setFrequencyPreference,
    studyVocabularyTypes,
    setStudyVocabularyTypes,
    generationPackSizeDefault,
    setGenerationPackSizeDefault,
    generationCefrWindowMode,
    setGenerationCefrWindowMode,
    generationKnownTermHandling,
    setGenerationKnownTermHandling,
    generationAudioVoiceGenderDefault,
    setGenerationAudioVoiceGenderDefault,
    generationExampleSentenceCount,
    setGenerationExampleSentenceCount,
    generationCustomInstructionsDefault,
    setGenerationCustomInstructionsDefault,
    emailRemindersEnabled,
    setEmailRemindersEnabled,
    streakAlertsEnabled,
    setStreakAlertsEnabled,
    effectiveCefrLevel,
    preferencesStatus,
    setPreferencesStatus,
    preferencesSubmitDisabled,
    isSavingPreferences,
    handlePreferencesSubmit,
    newCardsPerDayIsValid,
    generationPackSizeIsValid,
    customInstructionsIsValid,
    vocabularyTypesAreValid,
    toggleVocabularyType,
  };
}
