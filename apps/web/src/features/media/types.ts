import type { PackGenerationProgressView } from "@/features/pack-generation/types";
import type { ActionResult } from "@/lib/action-result";
import type {
  ContentAnalysisSummary,
  GenerationAudioVoiceGender,
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

  /**
   * ISO 639-1 language code (e.g. "en", "ja").
   * Sourced from `original_language` on both `TMDBMovieDetails` and `TMDBTvDetails`.
   * Null when TMDB omits the field.
   */
  originalLanguage: string | null;

  /**
   * Native title in the production's original language.
   * Sourced from `original_title` on `TMDBMovieDetails` and `original_name` on `TMDBTvDetails`.
   * Stored as the raw TMDB value; de-duplication against the display title is
   * deferred to render time, not performed here.
   * Null when TMDB omits the field.
   */
  originalTitle: string | null;

  /**
   * ISO 3166-1 alpha-2 country codes from TMDB `origin_country`.
   * TV only — always null for movies, since `TMDBMovieDetails` does not expose
   * an equivalent top-level field on the detail endpoint.
   * Null (not []) when the TV array is empty or absent.
   */
  originCountryCodes: string[] | null;

  /**
   * Age rating string (e.g. "PG-13", "TV-MA").
   * Selected with US-first logic: scans `release_dates.results` (movies) or
   * `content_ratings.results` (TV) for the "US" entry; falls back to the first
   * non-empty entry in the array when no US entry exists.
   * Null when no non-empty certification value is present in the TMDB response,
   * or when the appended sub-resource (`release_dates` / `content_ratings`) is
   * missing entirely.
   */
  contentCertification: string | null;

  /**
   * IMDb title identifier (e.g. "tt0816692").
   * Sourced from `imdb_id` on `TMDBMovieDetails` and from
   * `external_ids.imdb_id` on `TMDBTvDetails` (appended via
   * `append_to_response=external_ids`).
   * Null when the field is absent, when `external_ids` sub-resource is missing
   * from a TV response, or when TMDB returns null.
   */
  imdbId: string | null;
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
  audioVoiceGender: GenerationAudioVoiceGender;
  exampleSentenceCount: 1 | 2 | 3;
  customInstructions: string | null;
};

export type StartAnalysisInput = {
  tmdbId: number;
  mediaType: TMDBMediaType;
  seasonNumber?: number | null;
};

export type StartAnalysisActionResult = ActionResult<{
  analysis: MediaAnalysisSnapshot;
}>;

export type AnalysisStatusActionResult = ActionResult<{
  analysis: MediaAnalysisSnapshot;
}>;

export type PackGenerationSnapshot = PackGenerationProgressView;

export type StartPackGenerationInput = {
  tmdbId: number;
  mediaType: TMDBMediaType;
  seasonNumber?: number | null;
  request: Partial<GenerationDialogDefaults> & { forceRegenerate?: boolean };
};

export type StartPackGenerationActionResult = ActionResult<{
  generation: PackGenerationSnapshot;
}>;

export type PackGenerationStatusActionResult = ActionResult<{
  generation: PackGenerationSnapshot;
}>;
