import { CEFR_LEVELS, type CefrLevel } from "@/lib/constants";

export { CEFR_LEVELS, type CefrLevel };

/**
 * Maps a CEFR level to its 1-based ordinal (A1 = 1 ... C2 = 6).
 * Returns null for unknown or missing levels.
 */
export function cefrNumericFromLevel(level: string | null | undefined): number | null {
  const index = CEFR_LEVELS.indexOf(level as CefrLevel);
  return index === -1 ? null : index + 1;
}

/**
 * Maps a CEFR ordinal back to its level, rounding fractional values.
 * Returns null when the ordinal falls outside the CEFR range.
 */
export function cefrLevelFromNumeric(numeric: number | null | undefined): CefrLevel | null {
  if (typeof numeric !== "number" || !Number.isFinite(numeric)) {
    return null;
  }

  return CEFR_LEVELS[Math.round(numeric) - 1] ?? null;
}

/**
 * Averages CEFR ordinals and clamps the result back into the CEFR range.
 */
export function averageCefrLevel(numerics: number[]): CefrLevel | null {
  if (numerics.length === 0) {
    return null;
  }

  const average = numerics.reduce((sum, value) => sum + value, 0) / numerics.length;
  return cefrLevelFromNumeric(Math.min(CEFR_LEVELS.length, Math.max(1, average)));
}

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
