import type {
  ContentAnalysisSummary,
  GenerationCefrWindowMode,
  GenerationKnownTermHandling,
  StoredCefrLevel,
  StoredFrequencyPreference,
  StoredVocabularyKind,
} from "@/lib/server/db/json-contracts";
import type { ContentAnalysisStage } from "@/lib/server/media-analysis/contracts";
import type { TMDBMediaType } from "@/lib/tmdb-shared";

export type MediaAnalysisViewStatus =
  | "not_started"
  | "season_selection_required"
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type MediaAnalysisItemView = {
  id: string;
  termId: string;
  kind: "word" | "phrasal_verb" | "idiom" | "slang";
  displayText: string;
  baseCefrLevel: StoredCefrLevel | null;
  cefrLevel: StoredCefrLevel | null;
  occurrenceCount: number;
  frequencyRank: number | null;
  analysisSource: "nlp" | "analysis_llm";
  representativeContext: string | null;
  isSelectable: boolean;
};

export type MediaAnalysisSnapshot = {
  runId: string | null;
  status: MediaAnalysisViewStatus;
  stage: ContentAnalysisStage | null;
  progressMessage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  warnings: string[];
  summary: ContentAnalysisSummary | null;
  items: MediaAnalysisItemView[];
};

export type MediaDetailView = {
  tmdbId: number;
  mediaType: TMDBMediaType;
  title: string;
  subtitle: string | null;
  overview: string | null;
  releaseYear: string | null;
  runtimeMinutes: number | null;
  genres: string[];
  voteAverage: number | null;
  voteCount: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  selectedSeasonNumber: number | null;
  availableSeasonCount: number | null;
};

export type MediaDetailPageData = {
  media: MediaDetailView;
  learnerLevel: StoredCefrLevel | null;
  analysis: MediaAnalysisSnapshot;
  generation: PackGenerationSnapshot | null;
  generationDefaults: GenerationDialogDefaults;
};

export type GenerationDialogDefaults = {
  learnerCefrLevel: StoredCefrLevel | null;
  frequencyPreference: StoredFrequencyPreference;
  selectedVocabularyTypes: StoredVocabularyKind[];
  cefrWindowMode: GenerationCefrWindowMode;
  packSize: number;
  knownTermHandling: GenerationKnownTermHandling;
  exampleSentenceCount: 1 | 2 | 3;
  customInstructions: string | null;
};

export type StartAnalysisInput = {
  tmdbId: number;
  mediaType: TMDBMediaType;
  seasonNumber?: number | null;
};

export type StartAnalysisActionResult =
  | {
      success: true;
      analysis: MediaAnalysisSnapshot;
    }
  | {
      success: false;
      message: string;
      analysis?: MediaAnalysisSnapshot;
    };

export type AnalysisStatusActionResult =
  | {
      success: true;
      analysis: MediaAnalysisSnapshot;
    }
  | {
      success: false;
      message: string;
    };

export type PackGenerationSnapshot = {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  stage:
    | "queued"
    | "selecting_terms"
    | "generating_content"
    | "generating_assets"
    | "saving_pack"
    | "completed"
    | "failed";
  progressMessage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  packId: string | null;
};

export type StartPackGenerationInput = {
  tmdbId: number;
  mediaType: TMDBMediaType;
  seasonNumber?: number | null;
  request: Partial<GenerationDialogDefaults> & { forceRegenerate?: boolean };
};

export type StartPackGenerationActionResult =
  | {
      success: true;
      generation: PackGenerationSnapshot;
    }
  | {
      success: false;
      message: string;
      generation?: PackGenerationSnapshot;
    };

export type PackGenerationStatusActionResult =
  | {
      success: true;
      generation: PackGenerationSnapshot;
    }
  | {
      success: false;
      message: string;
    };
