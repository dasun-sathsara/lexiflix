/**
 * Shared domain literal unions.
 *
 * These types represent pure domain concepts (CEFR levels, vocabulary kinds, preference
 * enums) that are referenced by both client-safe modules and server-side persistence layers.
 * They are intentionally free of `server-only` imports so client code can depend on them.
 *
 * DB-structural types (JsonMap, TmdbRawPayload, WorkflowEventPayload, etc.) remain in
 * `lib/server/db/json-contracts.ts`.
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

/**
 * The NLP service returns subtitle evidence contexts as plain strings.
 * Older stored rows may hold `{ text: string }[]`, but the canonical representation is a string.
 */
export type NlpCandidateContext = string;

/**
 * Generated example sentences stored as a lightweight string list.
 */
export type ExampleSentenceList = string[];
