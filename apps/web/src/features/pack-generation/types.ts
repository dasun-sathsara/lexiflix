import type { ContentGenerationStage } from "@/lib/server/content-generation/contracts";
import type {
  GenerationCefrWindowMode,
  GenerationKnownTermHandling,
  StoredCefrLevel,
  StoredFrequencyPreference,
  StoredVocabularyKind,
} from "@/lib/server/db/json-contracts";

export type PackGenerationStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type PackGenerationContentSummary = {
  contentId: string;
  title: string;
  subtitle: string | null;
  posterUrl: string | null;
  mediaHref: string | null;
};

export type PackGenerationRequestSummary = {
  learnerCefrLevel: StoredCefrLevel | null;
  frequencyPreference: StoredFrequencyPreference;
  selectedVocabularyTypes: StoredVocabularyKind[];
  cefrWindowMode: GenerationCefrWindowMode;
  packSize: number;
  knownTermHandling: GenerationKnownTermHandling;
  exampleSentenceCount: 1 | 2 | 3;
  hasCustomInstructions: boolean;
  forceRegenerate: boolean;
};

export type PackGenerationProgressEvent = {
  id: string;
  stage: ContentGenerationStage;
  message: string | null;
  createdAt: string;
};

export type PackGenerationProgressView = {
  jobId: string;
  status: PackGenerationStatus;
  stage: ContentGenerationStage;
  progressMessage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  content: PackGenerationContentSummary;
  request: PackGenerationRequestSummary;
  packId: string | null;
  packHref: string | null;
  progressHref: string;
  events: PackGenerationProgressEvent[];
};

export type PackGenerationProgressActionResult =
  | {
      success: true;
      generation: PackGenerationProgressView;
    }
  | {
      success: false;
      message: string;
    };
