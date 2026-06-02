import type { CefrLevel } from "@/features/assessment/types";
import type { SettingsTab } from "@/features/settings/types";
import { CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH } from "@/lib/content-generation/constants";

export {
  VOCABULARY_KIND_LABELS as vocabularyTypeLabels,
  VOCABULARY_KINDS as STUDY_VOCABULARY_TYPES,
} from "@/lib/domain/vocabulary";
export { getInitials } from "@/lib/primitives/strings";

export function toSettingsTab(value: string | null): SettingsTab {
  return value === "preferences" ? "preferences" : "account";
}

export { CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH };

export const settingsCardClass =
  "gap-0 rounded-[calc(var(--radius)+2px)] border bg-card/60 py-0 shadow-sm";

export const settingsCardHeaderClass = "gap-1.5 border-b py-3.5";

export const settingsCardContentClass = "py-3.5";

export const settingsCardFooterClass =
  "border-t py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";

export const settingsFieldClass = "flex flex-col gap-1.5";

export const settingsLabelClass = "text-sm font-medium text-foreground";

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
