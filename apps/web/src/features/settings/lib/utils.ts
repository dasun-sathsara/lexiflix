import type { SettingsTab } from "@/features/settings/types";
import { CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH } from "@/lib/constants";
import type { CefrLevel } from "@/lib/domain/cefr";
import {
  SETTINGS_CARD_CLASS as settingsCardClass,
  SETTINGS_CARD_CONTENT_CLASS as settingsCardContentClass,
  SETTINGS_CARD_FOOTER_CLASS as settingsCardFooterClass,
  SETTINGS_CARD_HEADER_CLASS as settingsCardHeaderClass,
  SETTINGS_FIELD_CLASS as settingsFieldClass,
  SETTINGS_LABEL_CLASS as settingsLabelClass,
} from "@/lib/ui/settings-card";

export { getInitials } from "@/lib/primitives/strings";

export function toSettingsTab(value: string | null): SettingsTab {
  if (value === "preferences") {
    return "preferences";
  }

  if (value === "ai-services") {
    return "ai-services";
  }

  return "account";
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
