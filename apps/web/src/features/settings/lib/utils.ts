import type { CefrLevel } from "@/features/assessment/types";
import type { SettingsTab } from "@/features/settings/types";
import {
  CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH,
  STUDY_VOCABULARY_TYPES,
  SETTINGS_CARD_CLASS as settingsCardClass,
  SETTINGS_CARD_CONTENT_CLASS as settingsCardContentClass,
  SETTINGS_CARD_FOOTER_CLASS as settingsCardFooterClass,
  SETTINGS_CARD_HEADER_CLASS as settingsCardHeaderClass,
  SETTINGS_FIELD_CLASS as settingsFieldClass,
  SETTINGS_LABEL_CLASS as settingsLabelClass,
  VOCABULARY_KIND_LABELS as vocabularyTypeLabels,
} from "@/lib/constants";

export { vocabularyTypeLabels, STUDY_VOCABULARY_TYPES };
export { getInitials } from "@/lib/primitives/strings";

export function toSettingsTab(value: string | null): SettingsTab {
  return value === "preferences" ? "preferences" : "account";
}

export { CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH };

export {
  settingsCardClass,
  settingsCardHeaderClass,
  settingsCardContentClass,
  settingsCardFooterClass,
  settingsFieldClass,
  settingsLabelClass,
};

export function normalizeCustomInstructions(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Compute the effective CEFR level: manual override takes priority over
 * the assessed level recorded during onboarding.
 */
export function getEffectiveCefrLevel(
  manualOverrideLevel: CefrLevel | null,
  assessedLevel: CefrLevel | null,
): CefrLevel | null {
  return manualOverrideLevel ?? assessedLevel;
}
