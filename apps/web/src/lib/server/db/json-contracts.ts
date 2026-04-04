/*
  Current JSONB persistence contracts for LexiFlix.

  These types intentionally model only the current stored shapes.
  Pipeline-derived JSONB rows are treated as rebuildable state/cache for this demo app.
  When NLP or LLM payloads change in a breaking way, purge and rebuild the affected data instead
  of carrying long-lived compatibility parsers for stale rows.
*/

export type StoredCefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type StoredVocabularyKind = "word" | "phrasal_verb" | "idiom" | "slang";
export type StoredFrequencyPreference = "balanced" | "common_first" | "challenge_first";

export type JsonMap = Record<string, unknown>;

export type AssessmentAttemptState = {
  posterior: number[];
  usedItemIds: string[];
  askedLevels: StoredCefrLevel[];
  pendingItemId: string | null;
  answeredCount: number;
  totalResponseTimeMs: number;
  timedResponseCount: number;
};

export type AssessmentLevelProbabilities = Record<StoredCefrLevel, number>;

export type TmdbRawPayload = JsonMap;
export type ArtifactMetadata = JsonMap;
export type SubtitleAvailabilityMetadata = JsonMap;

/*
  For TV seasons, one subtitle snapshot represents one merged season corpus.
  We intentionally do not persist episode-level provenance in V1.
*/
export type SubtitleSnapshotMetadata = {
  deduplicated?: boolean;
  originalLineCount?: number;
  mergedEpisodeCount?: number;
  sourceLanguageCode?: string;
  [key: string]: unknown;
};

/*
  The current NLP service returns warnings as a simple string list.
*/
export type ProcessingWarningList = string[];

/*
  Mirrors the current NLP service response contract in apps/nlp_service.
*/
export type NlpCandidateContext = {
  text: string;
};

/*
  Keep generated example sentences lightweight until the UI needs richer structure.
*/
export type ExampleSentenceList = string[];

export type GenerationRequestSnapshot = {
  learnerCefrLevel?: StoredCefrLevel | null;
  frequencyPreference?: StoredFrequencyPreference;
  selectedVocabularyTypes?: StoredVocabularyKind[];
  subtitleProvider?: "opensubtitles" | "manual_upload";
  forceRegenerate?: boolean;
  [key: string]: unknown;
};

export type GenerationJobEventPayload = JsonMap;
export type NotificationPayload = JsonMap;
