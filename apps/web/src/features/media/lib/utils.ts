import type { MediaAnalysisSnapshot } from "@/features/media/types";
import { CEFR_LEVELS, getCefrColorClass } from "@/lib/domain/cefr";
import type { StoredCefrLevel } from "@/lib/server/db/json-contracts";
import type { ContentAnalysisStage } from "@/lib/server/media-analysis/contracts";

export { getCefrColorClass } from "@/lib/domain/cefr";
export {
  VOCABULARY_KIND_LABELS as VOCABULARY_TYPE_LABELS,
  VOCABULARY_KINDS as GENERATION_VOCABULARY_TYPES,
} from "@/lib/domain/vocabulary";

/** Human-readable labels for analysis pipeline stages. */
export const ANALYSIS_STAGE_LABELS: Record<ContentAnalysisStage, string> = {
  queued: "Queued",
  fetching_subtitles: "Fetching subtitles",
  running_nlp: "Analyzing vocabulary",
  running_llm: "Evaluating difficulty",
  merging_analysis: "Building profile",
  saving_analysis: "Saving results",
  completed: "Complete",
  failed: "Failed",
};

/** Pipeline steps shown during analysis in-progress view. */
export const ANALYSIS_PIPELINE_STEPS: {
  stage: ContentAnalysisStage;
  label: string;
  description: string;
}[] = [
  {
    stage: "fetching_subtitles",
    label: "Fetching subtitles",
    description: "Downloading subtitle data",
  },
  {
    stage: "running_nlp",
    label: "Analyzing vocabulary",
    description: "Extracting and analyzing words",
  },
  {
    stage: "running_llm",
    label: "Evaluating difficulty",
    description: "Rating CEFR difficulty levels",
  },
  {
    stage: "merging_analysis",
    label: "Building profile",
    description: "Combining analysis results",
  },
  {
    stage: "saving_analysis",
    label: "Saving results",
    description: "Storing the linguistic profile",
  },
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
 * Transforms the raw CEFR distribution mapping into a sorted array of objects
 * containing counts and percentages for UI display.
 */
export function buildCefrDistributionEntries(snapshot: MediaAnalysisSnapshot) {
  const distribution = snapshot.summary?.cefrDistribution ?? {};
  const total = Object.values(distribution).reduce(
    (sum, value) => sum + (typeof value === "number" ? value : 0),
    0,
  );

  return CEFR_LEVELS.map((level) => {
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

  const strongestEntry = CEFR_LEVELS.map((level) => ({
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
      label: "Ready to Explore",
      detail: contentLevel
        ? `This title averages ${contentLevel} difficulty. Set your level to check your fit.`
        : "Set your CEFR level in settings to compare content fit.",
      toneClass: "border-muted-foreground/20 bg-muted/50 text-muted-foreground",
    };
  }

  if (!contentLevel) {
    return {
      label: "Ready to Explore",
      detail: `Your current CEFR level is ${learnerLevel}. Ready to generate packs.`,
      toneClass: "border-muted-foreground/20 bg-muted/50 text-muted-foreground",
    };
  }

  const challengeDelta = CEFR_LEVELS.indexOf(contentLevel) - CEFR_LEVELS.indexOf(learnerLevel);

  const isGoodFit = challengeDelta <= 0;
  if (isGoodFit) {
    return {
      label: "Perfect Match",
      detail: `Fits your ${learnerLevel} profile (Title average: ${contentLevel}). Great for reinforcing your current vocabulary.`,
      toneClass: getCefrColorClass("A1"),
    };
  }

  const isSlightlyChallenging = challengeDelta === 1;
  if (isSlightlyChallenging) {
    return {
      label: "Comfortable Stretch",
      detail: `Averages ${contentLevel} (your level: ${learnerLevel}). A healthy challenge to level up your vocabulary.`,
      toneClass: getCefrColorClass("B1"),
    };
  }

  return {
    label: "Challenging Stretch",
    detail: `Averages ${contentLevel} (your level: ${learnerLevel}). Expect a high density of unfamiliar words and phrases.`,
    toneClass: getCefrColorClass("C1"),
  };
}
