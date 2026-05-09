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
    description: "Waiting for generation to start.",
    tone: "default",
  },
  running: {
    label: "Generating",
    description: "Creating definitions, examples, audio, and images.",
    tone: "default",
  },
  completed: {
    label: "Ready",
    description: "Your study pack is ready.",
    tone: "success",
  },
  failed: {
    label: "Generation Failed",
    description: "Something went wrong. Retry generation or adjust the request and try again.",
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
    label: "Selecting Vocabulary",
    description: "Choosing terms that match your CEFR level and preferences.",
    tone: "default",
  },
  generating_content: {
    label: "Writing Definitions",
    description: "Generating meanings and example sentences.",
    tone: "default",
  },
  generating_assets: {
    label: "Creating Audio & Images",
    description: "Generating pronunciation audio and optional images.",
    tone: "default",
  },
  saving_pack: {
    label: "Saving Pack",
    description: "Finalizing your pack and scheduling reviews.",
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
  downrank_known: "De-prioritize words I know",
  exclude_known: "Skip words I already know",
  include_known: "Include everything (even known words)",
  one_level_above: "One level above",
  same_level: "Keep at my current level",
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
  if (generation.status === "failed") {
    return generation.errorMessage ?? PUBLIC_GENERATION_FAILURE_MESSAGE;
  }
  return getGenerationProgressState(generation).description;
}
