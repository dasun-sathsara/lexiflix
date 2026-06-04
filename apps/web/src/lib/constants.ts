/**
 * LexiFlix Centralized Web Application Constants
 *
 * Single source of truth for application constants, domain literals,
 * settings defaults, rate limits, SRS timing, and UI constraints.
 */

import type { StoredCefrLevel, StoredVocabularyKind } from "@/lib/server/db/json-contracts";

// -----------------------------------------------------------------------------
// Domain Constants (CEFR & Vocabulary)
// -----------------------------------------------------------------------------
export const CEFR_LEVELS = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const satisfies readonly StoredCefrLevel[];

export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const VOCABULARY_KINDS = [
  "word",
  "phrasal_verb",
  "idiom",
  "slang",
] as const satisfies readonly StoredVocabularyKind[];

export const VOCABULARY_KIND_LABELS: Record<StoredVocabularyKind, string> = {
  word: "Words",
  phrasal_verb: "Phrasal verbs",
  idiom: "Idioms",
  slang: "Slang",
} as const;

// -----------------------------------------------------------------------------
// Content Generation & Pipeline
// -----------------------------------------------------------------------------
export const CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH = 1200;
export const CONTENT_GENERATION_PIPELINE_VERSION = "content-generation-v2";
export const PUBLIC_GENERATION_FAILURE_MESSAGE =
  "Pack generation could not be completed. Retry generation or adjust the request and try again.";
export const RECENT_VISIBLE_JOB_LIMIT = 8;
export const TEXT_BATCH_SIZE = 8;
export const TEXT_CONCURRENCY = 2;
export const IMAGE_REQUEST_DELAY_MS = 10_000;

// -----------------------------------------------------------------------------
// Settings & Preferences Defaults & Options
// -----------------------------------------------------------------------------
export const DEFAULT_STUDY_LANGUAGE_CODE = "en";
export const DEFAULT_TARGET_LANGUAGE = "English";
export const DEFAULT_NEW_CARDS_PER_DAY = 20;
export const DEFAULT_FREQUENCY_PREFERENCE = "balanced" as const;
export const DEFAULT_GENERATION_PACK_SIZE = 20;
export const DEFAULT_GENERATION_CEFR_WINDOW_MODE = "same_level" as const;
export const DEFAULT_GENERATION_KNOWN_TERM_HANDLING = "exclude_known" as const;
export const DEFAULT_GENERATION_AUDIO_VOICE_GENDER = "female" as const;
export const DEFAULT_GENERATION_EXAMPLE_SENTENCE_COUNT = 1 as const;
export const DEFAULT_GENERATION_CUSTOM_INSTRUCTIONS = null;
export const DEFAULT_EMAIL_REMINDERS_ENABLED = true;
export const DEFAULT_STREAK_ALERTS_ENABLED = true;
export const DEFAULT_STUDY_VOCABULARY_TYPES: readonly StoredVocabularyKind[] = Object.freeze([
  ...VOCABULARY_KINDS,
]);

export const FREQUENCY_PREFERENCES = ["balanced", "common_first", "challenge_first"] as const;

export const GENERATION_CEFR_WINDOW_MODES = [
  "same_level",
  "one_level_above",
  "all_levels_above",
] as const;

export const GENERATION_KNOWN_TERM_HANDLINGS = [
  "exclude_known",
  "downrank_known",
  "include_known",
] as const;

export const GENERATION_AUDIO_VOICE_GENDERS = ["female", "male"] as const;

export const STUDY_VOCABULARY_TYPES = VOCABULARY_KINDS;

// -----------------------------------------------------------------------------
// Spaced Repetition System (SRS) & Time
// -----------------------------------------------------------------------------
export const MINUTE_MS = 60 * 1000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

export const SRS_CONFIG = {
  firstLearningStepMs: MINUTE_MS,
  secondLearningStepMs: 10 * MINUTE_MS,
  graduatingIntervalDays: 1,
  easyIntervalDays: 4,
  startingEaseFactor: 2.5,
  easyBonus: 1.3,
  hardIntervalMultiplier: 1.2,
  minimumEaseFactor: 1.3,
  leechThreshold: 8,
  maximumIntervalDays: 36_500,
  masteryRepetitionThreshold: 5,
  masteryIntervalThresholdDays: 21,
} as const;

export const APP_TIME_ZONE = "Asia/Colombo";
export const APP_TIME_ZONE_OFFSET_MINUTES = 5 * 60 + 30;

// -----------------------------------------------------------------------------
// Assessment & Adaptive Testing
// -----------------------------------------------------------------------------
export const ASSESSMENT_LIMITS = {
  minItems: 8,
  maxItems: 12,
} as const;

export const FAST_RESPONSE_THRESHOLD_MS = 600;
export const FAST_RESPONSE_EXTRA_ITEMS = 2;

// -----------------------------------------------------------------------------
// Media & Pipeline Analysis
// -----------------------------------------------------------------------------
export const MEDIA_ANALYSIS_PIPELINE_VERSION = "media-analysis-v1";
export const MEDIA_ANALYSIS_FINGERPRINT = `media-analysis:${MEDIA_ANALYSIS_PIPELINE_VERSION}`;
export const OPENSUBTITLES_LOGIN_MIN_INTERVAL_MS = 1_100;

// -----------------------------------------------------------------------------
// Admin & UI Layout Constants
// -----------------------------------------------------------------------------
export const ADMIN_USERS_PAGE_SIZE = 20;
export const MOBILE_BREAKPOINT = 768;

export const SETTINGS_CARD_CLASS =
  "gap-0 rounded-[calc(var(--radius)+2px)] border bg-card/60 py-0 shadow-sm";
export const SETTINGS_CARD_HEADER_CLASS = "gap-1.5 border-b py-3.5";
export const SETTINGS_CARD_CONTENT_CLASS = "py-3.5";
export const SETTINGS_CARD_FOOTER_CLASS =
  "border-t py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";
export const SETTINGS_FIELD_CLASS = "flex flex-col gap-1.5";
export const SETTINGS_LABEL_CLASS = "text-sm font-medium text-foreground";

// -----------------------------------------------------------------------------
// Storage & Third-Party Integrations
// -----------------------------------------------------------------------------
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export const TMDB_IMAGE_SIZES = {
  poster: {
    sm: "/w342",
    md: "/w500",
    lg: "/w780",
    original: "/original",
  },
  backdrop: {
    sm: "/w300",
    md: "/w780",
    lg: "/w1280",
    original: "/original",
  },
} as const;
