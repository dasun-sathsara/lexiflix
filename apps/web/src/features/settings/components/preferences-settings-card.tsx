"use client";

import type { SettingsPreferences } from "@/features/settings/types";
import { usePreferencesForm } from "../hooks/use-preferences-form";

import { PreferencesGenerationSection } from "./preferences-generation-section";
import { PreferencesNotificationsSection } from "./preferences-notifications-section";

type PreferencesSettingsCardProps = {
  preferences: SettingsPreferences;
};

/**
 * Preferences settings card — groups CEFR level override, daily card cap,
 * content generation defaults, notification toggles, and vocabulary-type
 * selection into a single submit-scoped form using react-hook-form.
 */
export function PreferencesSettingsCard({ preferences }: PreferencesSettingsCardProps) {
  const {
    form,
    initialPreferences,
    effectiveCefrLevel,
    preferencesStatus,
    setPreferencesStatus,
    isSavingPreferences,
    handleSubmit,
    isDirty,
    errors,
    toggleVocabularyType,
  } = usePreferencesForm(preferences);

  const { control, register, watch } = form;

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PreferencesGenerationSection
          control={control}
          register={register}
          watch={watch}
          errors={errors}
          initialPreferences={initialPreferences}
          effectiveCefrLevel={effectiveCefrLevel}
          setPreferencesStatus={setPreferencesStatus}
          toggleVocabularyType={toggleVocabularyType}
        />
        <PreferencesNotificationsSection
          control={control}
          preferencesStatus={preferencesStatus}
          setPreferencesStatus={setPreferencesStatus}
          isSavingPreferences={isSavingPreferences}
          isDirty={isDirty}
        />
      </div>
    </form>
  );
}
