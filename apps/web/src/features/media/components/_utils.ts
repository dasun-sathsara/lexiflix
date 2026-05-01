import type { MediaAnalysisSnapshot } from "@/features/media/types";
import type { StoredCefrLevel, StoredVocabularyKind } from "@/lib/server/db/json-contracts";

export const CEFR_LEVEL_ORDER: StoredCefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const VOCABULARY_TYPE_LABELS: Record<StoredVocabularyKind, string> = {
  word: "Words",
  phrasal_verb: "Phrasal verbs",
  idiom: "Idioms",
  slang: "Slang",
};

export const GENERATION_VOCABULARY_TYPES: StoredVocabularyKind[] = [
  "word",
  "phrasal_verb",
  "idiom",
  "slang",
];

/**
 * Formats a runtime in minutes into a human-readable string (e.g., "1h 30m").
 */
export function formatRuntime(minutes: number | null): string | null {
  if (!minutes) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
}

/**
 * Maps a CEFR level to its corresponding UI color classes.
 */
export function getCefrColor(level: string | null | undefined): string {
  if (!level) {
    return "border-muted-foreground/20 bg-muted/50 text-muted-foreground";
  }

  if (level.startsWith("A")) {
    return "border-emerald-200/60 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/20 dark:text-emerald-300";
  }

  if (level.startsWith("B")) {
    return "border-amber-200/60 bg-amber-500/10 text-amber-700 dark:border-amber-500/20 dark:text-amber-300";
  }

  return "border-rose-200/60 bg-rose-500/10 text-rose-700 dark:border-rose-500/20 dark:text-rose-300";
}

/**
 * Transforms the raw CEFR distribution mapping into a sorted array of objects
 * containing counts and percentages for UI display.
 */
export function buildCefrDistributionEntries(snapshot: MediaAnalysisSnapshot) {
  const distribution = snapshot.summary?.cefrDistribution ?? {};
  const total = Object.values(distribution).reduce(
    (sum, value) => sum + (typeof value === "number" ? value : 0),
    0,
  );

  return CEFR_LEVEL_ORDER.map((level) => {
    const count = distribution[level] ?? 0;
    return {
      level,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

/**
 * Calculates a fallback CEFR level for a media snapshot when a pre-calculated average
 * is missing, by determining the CEFR tier with the highest term count.
 */
export function getFallbackContentLevel(snapshot: MediaAnalysisSnapshot): StoredCefrLevel | null {
  const distribution = snapshot.summary?.cefrDistribution;

  if (!distribution) {
    return null;
  }

  const strongestEntry = CEFR_LEVEL_ORDER.map((level) => ({
    level,
    count: distribution[level] ?? 0,
  })).sort((a, b) => b.count - a.count)[0];

  const hasValidStrongestEntry = strongestEntry && strongestEntry.count > 0;
  return hasValidStrongestEntry ? strongestEntry.level : null;
}

/**
 * Evaluates the challenge level of a media snapshot against a learner's CEFR level.
 */
export function getChallengeSignal(
  snapshot: MediaAnalysisSnapshot,
  learnerLevel: StoredCefrLevel | null,
) {
  if (snapshot.status !== "completed") {
    return null;
  }

  const contentLevel = snapshot.summary?.averageCefrLevel ?? getFallbackContentLevel(snapshot);

  if (!learnerLevel) {
    return {
      label: "Analysis complete, learner level unavailable",
      detail: contentLevel
        ? `Average extracted level: ${contentLevel}`
        : "Set a CEFR level to compare fit.",
      toneClass: "border-muted-foreground/20 bg-muted/50 text-muted-foreground",
    };
  }

  if (!contentLevel) {
    return {
      label: "Analysis complete, content level unavailable",
      detail: `Your current CEFR level: ${learnerLevel}`,
      toneClass: "border-muted-foreground/20 bg-muted/50 text-muted-foreground",
    };
  }

  const challengeDelta =
    CEFR_LEVEL_ORDER.indexOf(contentLevel) - CEFR_LEVEL_ORDER.indexOf(learnerLevel);

  const isGoodFit = challengeDelta <= 0;
  if (isGoodFit) {
    return {
      label: "Good fit",
      detail: `Average ${contentLevel} vs your ${learnerLevel}`,
      toneClass:
        "border-emerald-200/60 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/20 dark:text-emerald-300",
    };
  }

  const isSlightlyChallenging = challengeDelta === 1;
  if (isSlightlyChallenging) {
    return {
      label: "Slightly challenging",
      detail: `Average ${contentLevel} vs your ${learnerLevel}`,
      toneClass:
        "border-amber-200/60 bg-amber-500/10 text-amber-700 dark:border-amber-500/20 dark:text-amber-300",
    };
  }

  return {
    label: "Stretch title",
    detail: `Average ${contentLevel} vs your ${learnerLevel}`,
    toneClass:
      "border-rose-200/60 bg-rose-500/10 text-rose-700 dark:border-rose-500/20 dark:text-rose-300",
  };
}
