import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { CefrLevel } from "@/features/assessment/types";
import { getEffectiveCefrLevel, normalizeCustomInstructions } from "@/features/settings/lib/utils";
import { updateSettingsPreferencesAction } from "@/features/settings/server/actions";
import {
  type PreferencesSettingsInput,
  preferencesSettingsSchema,
  type SettingsPreferences,
  type StatusState,
} from "@/features/settings/types";
import type { StoredVocabularyKind } from "@/lib/server/db/json-contracts";

export function usePreferencesForm(preferences: SettingsPreferences) {
  const router = useRouter();
  const [preferencesStatus, setPreferencesStatus] = useState<StatusState>(null);
  const [initialPreferences, setInitialPreferences] = useState(preferences);
  const [isSavingPreferences, startSavingPreferences] = useTransition();

  const form = useForm<PreferencesSettingsInput>({
    resolver: zodResolver(preferencesSettingsSchema),
    defaultValues: {
      manualOverrideSelection: preferences.manualOverrideLevel ?? "assessed",
      newCardsPerDay: preferences.newCardsPerDay,
      frequencyPreference: preferences.frequencyPreference,
      studyVocabularyTypes: preferences.studyVocabularyTypes,
      generationPackSizeDefault: preferences.generationPackSizeDefault,
      generationCefrWindowMode: preferences.generationCefrWindowMode,
      generationKnownTermHandling: preferences.generationKnownTermHandling,
      generationAudioVoiceGenderDefault: preferences.generationAudioVoiceGenderDefault,
      generationExampleSentenceCount: preferences.generationExampleSentenceCount,
      generationCustomInstructionsDefault: preferences.generationCustomInstructionsDefault ?? "",
      emailRemindersEnabled: preferences.emailRemindersEnabled,
      streakAlertsEnabled: preferences.streakAlertsEnabled,
    },
  });

  const {
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { isDirty, errors },
  } = form;

  const manualOverrideSelection = watch("manualOverrideSelection");
  const studyVocabularyTypes = watch("studyVocabularyTypes");

  const manualOverrideLevel: CefrLevel | null =
    manualOverrideSelection === "assessed" ? null : (manualOverrideSelection as CefrLevel);

  const effectiveCefrLevel = getEffectiveCefrLevel(
    manualOverrideLevel,
    initialPreferences.assessedLevel,
  );

  const toggleVocabularyType = (kind: StoredVocabularyKind, checked: boolean) => {
    if (checked) {
      if (!studyVocabularyTypes.includes(kind)) {
        setValue("studyVocabularyTypes", [...studyVocabularyTypes, kind], {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    } else {
      const next = studyVocabularyTypes.filter((v: StoredVocabularyKind) => v !== kind);
      if (next.length > 0) {
        setValue("studyVocabularyTypes", next, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }
    setPreferencesStatus(null);
  };

  const onSubmit = (data: PreferencesSettingsInput) => {
    setPreferencesStatus(null);
    startSavingPreferences(async () => {
      try {
        const manualOverrideLevel =
          data.manualOverrideSelection === "assessed"
            ? null
            : (data.manualOverrideSelection as CefrLevel);

        const normalizedCustomInstructions = normalizeCustomInstructions(
          data.generationCustomInstructionsDefault,
        );

        const result = await updateSettingsPreferencesAction({
          manualOverrideLevel,
          newCardsPerDay: data.newCardsPerDay,
          frequencyPreference: data.frequencyPreference,
          studyVocabularyTypes: data.studyVocabularyTypes,
          generationPackSizeDefault: data.generationPackSizeDefault,
          generationCefrWindowMode: data.generationCefrWindowMode,
          generationKnownTermHandling: data.generationKnownTermHandling,
          generationAudioVoiceGenderDefault: data.generationAudioVoiceGenderDefault,
          generationExampleSentenceCount: data.generationExampleSentenceCount as 1 | 2 | 3,
          generationCustomInstructionsDefault: normalizedCustomInstructions,
          emailRemindersEnabled: data.emailRemindersEnabled,
          streakAlertsEnabled: data.streakAlertsEnabled,
        });

        if (!result.ok) {
          setPreferencesStatus({ type: "error", message: result.error });
          toast.error(result.error);
          return;
        }

        const next = result.data.preferences;
        setInitialPreferences(next);
        reset({
          manualOverrideSelection: next.manualOverrideLevel ?? "assessed",
          newCardsPerDay: next.newCardsPerDay,
          frequencyPreference: next.frequencyPreference,
          studyVocabularyTypes: next.studyVocabularyTypes,
          generationPackSizeDefault: next.generationPackSizeDefault,
          generationCefrWindowMode: next.generationCefrWindowMode,
          generationKnownTermHandling: next.generationKnownTermHandling,
          generationAudioVoiceGenderDefault: next.generationAudioVoiceGenderDefault,
          generationExampleSentenceCount: next.generationExampleSentenceCount,
          generationCustomInstructionsDefault: next.generationCustomInstructionsDefault ?? "",
          emailRemindersEnabled: next.emailRemindersEnabled,
          streakAlertsEnabled: next.streakAlertsEnabled,
        });

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
    form,
    initialPreferences,
    effectiveCefrLevel,
    preferencesStatus,
    setPreferencesStatus,
    isSavingPreferences,
    handleSubmit: handleSubmit(onSubmit),
    isDirty,
    errors,
    toggleVocabularyType,
  };
}
