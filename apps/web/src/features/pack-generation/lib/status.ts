import type { PackGenerationProgressView } from "@/features/pack-generation/types";
import type { ContentGenerationStage } from "@/lib/server/content-generation/contracts";
import { VOCABULARY_KIND_LABELS } from "@/lib/vocabulary-kind-labels";

type GenerationStatus = PackGenerationProgressView["status"];
type GenerationTone = "default" | "success" | "danger" | "muted";

export const PUBLIC_GENERATION_FAILURE_MESSAGE =
  "Pack generation could not be completed. Retry generation or adjust the request and try again.";

const statusCopy: Record<
  GenerationStatus,
  {
    label: string;
    description: string;
    tone: GenerationTone;
  }
> = {
  queued: {
    label: "Queued",
    description: "Waiting to start.",
    tone: "default",
  },
  running: {
    label: "Generating",
    description: "Pack generation is running.",
    tone: "default",
  },
  completed: {
    label: "Ready",
    description: "Generated pack is ready.",
    tone: "success",
  },
  failed: {
    label: "Needs retry",
    description: PUBLIC_GENERATION_FAILURE_MESSAGE,
    tone: "danger",
  },
  cancelled: {
    label: "Cancelled",
    description: "Generation was cancelled.",
    tone: "muted",
  },
};

const stageCopy: Record<
  ContentGenerationStage,
  {
    label: string;
    description: string;
    tone: GenerationTone;
  }
> = {
  queued: {
    label: "Queued",
    description: "Waiting for generation to start.",
    tone: "default",
  },
  selecting_terms: {
    label: "Choosing vocabulary",
    description: "Choosing vocabulary that matches this learner and request.",
    tone: "default",
  },
  generating_content: {
    label: "Writing learning content",
    description: "Creating meanings and example sentences.",
    tone: "default",
  },
  generating_assets: {
    label: "Creating study assets",
    description: "Preparing optional audio and image support.",
    tone: "default",
  },
  saving_pack: {
    label: "Saving pack",
    description: "Saving the generated study pack.",
    tone: "default",
  },
  completed: {
    label: "Ready to study",
    description: "Generated pack is ready.",
    tone: "success",
  },
  failed: {
    label: "Needs retry",
    description: PUBLIC_GENERATION_FAILURE_MESSAGE,
    tone: "danger",
  },
};

const valueLabels: Record<string, string> = {
  ...VOCABULARY_KIND_LABELS,
  all_levels_above: "All levels above",
  balanced: "Balanced",
  challenge_first: "Challenge first",
  common_first: "Common first",
  downrank_known: "Downrank known",
  exclude_known: "Exclude known",
  include_known: "Include known",
  one_level_above: "One level above",
  same_level: "Same level",
};

export function formatGenerationLabel(value: string) {
  return valueLabels[value] ?? value.replaceAll("_", " ");
}

export function getGenerationStageCopy(stage: ContentGenerationStage) {
  return stageCopy[stage];
}

export function getGenerationStatusCopy(status: GenerationStatus) {
  return statusCopy[status];
}

export function isGenerationActive(status: GenerationStatus) {
  return status === "queued" || status === "running";
}

export function getGenerationProgressState(generation: PackGenerationProgressView) {
  if (generation.status === "running") {
    return stageCopy[generation.stage];
  }

  if (generation.status === "queued") {
    return stageCopy.queued;
  }

  return statusCopy[generation.status];
}

export function getGenerationStatusMessage(generation: PackGenerationProgressView) {
  return getGenerationProgressState(generation).description;
}
