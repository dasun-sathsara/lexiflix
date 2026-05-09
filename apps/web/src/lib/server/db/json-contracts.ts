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
export type GenerationCefrWindowMode = "same_level" | "one_level_above" | "all_levels_above";
export type GenerationKnownTermHandling = "exclude_known" | "downrank_known" | "include_known";
export type GenerationAudioVoiceGender = "female" | "male";
export type CuratedSourceProvider = "tmdb";
export type CuratedMediaType = "movie" | "tv";
export type CuratedCurationScope = "movie" | "show" | "season";

export type JsonMap = Record<string, unknown>;
export type CuratedGenreSnapshot = {
  id: number;
  name: string;
};

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

/*
  The current NLP service returns warnings as a simple string list.
*/
export type ProcessingWarningList = string[];

export type ContentAnalysisSummary = {
  totalWordCount?: number;
  uniqueLemmaCount?: number;
  extractedItemCount?: number;
  selectableItemCount?: number;
  kindCounts?: Partial<Record<StoredVocabularyKind, number>>;
  cefrDistribution?: Partial<Record<StoredCefrLevel, number>>;
  averageCefrLevel?: StoredCefrLevel | null;
  speechRateWpm?: number | null;
  subtitleLineCount?: number;
  [key: string]: unknown;
};

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
  learnerCefrLevel: StoredCefrLevel | null;
  frequencyPreference: StoredFrequencyPreference;
  selectedVocabularyTypes: StoredVocabularyKind[];
  cefrWindowMode: GenerationCefrWindowMode;
  packSize: number;
  knownTermHandling: GenerationKnownTermHandling;
  audioVoiceGender: GenerationAudioVoiceGender;
  exampleSentenceCount: 1 | 2 | 3;
  customInstructions: string | null;
  forceRegenerate: boolean;
};

export type WorkflowEventPayload = JsonMap;
export type NotificationPayload = JsonMap;
