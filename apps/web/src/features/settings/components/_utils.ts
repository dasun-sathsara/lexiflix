import type { CefrLevel } from "@/features/assessment/lib/types";
import type { StoredVocabularyKind } from "@/lib/server/db/json-contracts";
import { VOCABULARY_KIND_LABELS, VOCABULARY_KINDS } from "@/lib/vocabulary-kind-labels";

export type StatusState = {
  type: "success" | "error";
  message: string;
} | null;

export type ManualOverrideSelection = CefrLevel | "assessed";

export type SettingsTab = "account" | "preferences";

export function toSettingsTab(value: string | null): SettingsTab {
  return value === "preferences" ? "preferences" : "account";
}

export const vocabularyTypeLabels: Record<StoredVocabularyKind, string> = {
  ...VOCABULARY_KIND_LABELS,
};

export const STUDY_VOCABULARY_TYPES: StoredVocabularyKind[] = [...VOCABULARY_KINDS];

export const CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH = 1200;

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

export function validateCustomInstructionsLength(value: string) {
  return value.trim().length <= CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH;
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

/**
 * Derive display initials from a name string (first letters of each word).
 */
export function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "LX"
  );
}
