import type { PackGenerationProgressView } from "@/features/pack-generation/types";

type GenerationStatus = PackGenerationProgressView["status"];

const statusCopy: Record<
  GenerationStatus,
  {
    label: string;
    description: string;
    tone: "default" | "success" | "danger" | "muted";
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
    label: "Failed",
    description: "Generation needs attention.",
    tone: "danger",
  },
  cancelled: {
    label: "Cancelled",
    description: "Generation was cancelled.",
    tone: "muted",
  },
};

export function formatGenerationLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function getGenerationStatusCopy(status: GenerationStatus) {
  return statusCopy[status];
}

export function isGenerationActive(status: GenerationStatus) {
  return status === "queued" || status === "running";
}

export function getGenerationStatusMessage(generation: PackGenerationProgressView) {
  return generation.progressMessage ?? statusCopy[generation.status].description;
}
