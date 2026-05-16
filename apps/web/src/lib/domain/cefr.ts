import type { StoredCefrLevel } from "@/lib/server/db/json-contracts";

export const CEFR_LEVELS: readonly StoredCefrLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];

/**
 * Maps a CEFR level string to its corresponding UI color classes.
 */
export function getCefrColorClass(level: string | null | undefined): string {
  if (!level) {
    return "bg-muted text-muted-foreground border-border";
  }
  if (level.startsWith("A")) {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:text-emerald-200 dark:border-emerald-500/20";
  }
  if (level.startsWith("B")) {
    return "bg-amber-500/10 text-amber-800 border-amber-200/60 dark:text-amber-200 dark:border-amber-500/20";
  }
  return "bg-rose-500/10 text-rose-700 border-rose-200/60 dark:text-rose-200 dark:border-rose-500/20";
}
