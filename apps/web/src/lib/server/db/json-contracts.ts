/*
  Current JSONB persistence contracts for LexiFlix.

  These types intentionally model only the current stored shapes.
  Pipeline-derived JSONB rows are treated as rebuildable state/cache for this demo app.
  When NLP or LLM payloads change in a breaking way, purge and rebuild the affected data instead
  of carrying long-lived compatibility parsers for stale rows.
*/

// Domain literal unions live in lib/domain/types.ts and are re-exported here for backward compat.
export type {
  CuratedCurationScope,
  CuratedMediaType,
  CuratedSourceProvider,
  ExampleSentenceList,
  GenerationAudioVoiceGender,
  GenerationCefrWindowMode,
  GenerationKnownTermHandling,
  NlpCandidateContext,
  StoredCefrLevel,
  StoredFrequencyPreference,
  StoredVocabularyKind,
} from "@/lib/domain/types";

import type {
  GenerationAudioVoiceGender,
  GenerationCefrWindowMode,
  GenerationKnownTermHandling,
  StoredCefrLevel,
  StoredFrequencyPreference,
  StoredVocabularyKind,
} from "@/lib/domain/types";

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

export type ExampleSentenceAudioArtifactList = Array<string | null>;

export type GenerationRequestSnapshot = {
  learnerCefrLevel: StoredCefrLevel | null;
  frequencyPreference: StoredFrequencyPreference;
  selectedVocabularyTypes: StoredVocabularyKind[];
  cefrWindowMode: GenerationCefrWindowMode;
  packSize: number;
  knownTermHandling: GenerationKnownTermHandling;
  audioVoiceGender: GenerationAudioVoiceGender;
  imageEnabled: boolean;
  exampleSentenceCount: 1 | 2 | 3;
  customInstructions: string | null;
  forceRegenerate: boolean;
};

export type WorkflowEventPayload = JsonMap;
export type NotificationPayload = JsonMap;
