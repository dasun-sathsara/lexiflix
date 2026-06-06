import "server-only";

import { z } from "zod";
import {
  CEFR_LEVELS,
  CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH,
  DEFAULT_FREQUENCY_PREFERENCE,
  DEFAULT_GENERATION_AUDIO_VOICE_GENDER,
  DEFAULT_GENERATION_CEFR_WINDOW_MODE,
  DEFAULT_GENERATION_EXAMPLE_SENTENCE_COUNT,
  DEFAULT_GENERATION_KNOWN_TERM_HANDLING,
  DEFAULT_GENERATION_PACK_SIZE,
  FREQUENCY_PREFERENCES,
  GENERATION_AUDIO_VOICE_GENDERS,
  GENERATION_CEFR_WINDOW_MODES,
  GENERATION_KNOWN_TERM_HANDLINGS,
  VOCABULARY_KINDS,
} from "@/lib/constants";
import type { StoredCefrLevel, StoredVocabularyKind } from "@/lib/server/db/json-contracts";

export const PACK_GENERATION_STATUSES = ["queued", "running", "completed", "failed"] as const;

export const CONTENT_GENERATION_STAGES = [
  "queued",
  "selecting_terms",
  "generating_content",
  "generating_assets",
  "saving_pack",
  "completed",
  "failed",
] as const;

export type PackGenerationStatus = (typeof PACK_GENERATION_STATUSES)[number];
export type ContentGenerationStage = (typeof CONTENT_GENERATION_STAGES)[number];

export const generationRequestSchema = z.object({
  learnerCefrLevel: z.enum(CEFR_LEVELS).nullable(),
  frequencyPreference: z.enum(FREQUENCY_PREFERENCES).default(DEFAULT_FREQUENCY_PREFERENCE),
  selectedVocabularyTypes: z
    .array(z.enum(VOCABULARY_KINDS))
    .min(1)
    .default([...VOCABULARY_KINDS]),
  cefrWindowMode: z.enum(GENERATION_CEFR_WINDOW_MODES).default(DEFAULT_GENERATION_CEFR_WINDOW_MODE),
  packSize: z.number().int().positive().default(DEFAULT_GENERATION_PACK_SIZE),
  knownTermHandling: z
    .enum(GENERATION_KNOWN_TERM_HANDLINGS)
    .default(DEFAULT_GENERATION_KNOWN_TERM_HANDLING),
  audioVoiceGender: z
    .enum(GENERATION_AUDIO_VOICE_GENDERS)
    .default(DEFAULT_GENERATION_AUDIO_VOICE_GENDER),
  imageEnabled: z.boolean().default(true),
  exampleSentenceCount: z
    .union([z.literal(1), z.literal(2), z.literal(3)])
    .default(DEFAULT_GENERATION_EXAMPLE_SENTENCE_COUNT),
  customInstructions: z
    .string()
    .trim()
    .max(CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH)
    .nullable()
    .optional()
    .transform((value) => value || null),
  forceRegenerate: z.boolean().default(false),
});

export type GenerationRequestInput = z.input<typeof generationRequestSchema>;
export type GenerationRequestSnapshot = z.output<typeof generationRequestSchema>;

export type SelectedGenerationItem = {
  analysisItemId: string;
  termId: string;
  kind: StoredVocabularyKind;
  displayText: string;
  /** Every part of speech this lemma was observed with, most frequent first. */
  partsOfSpeech: string[];
  cefrLevel: StoredCefrLevel | null;
  occurrenceCount: number;
  frequencyRank: number | null;
  representativeContext: string | null;
  contexts: string[];
  includedReason: string;
};

export type GeneratedTextItem = {
  analysisItemId: string;
  termId: string;
  meaning: string;
  exampleSentences: string[];
  imageBrief: string | null;
  imageEligibility: {
    eligible: boolean;
    reason: string;
  };
  warnings: string[];
};

export type GeneratedBinaryArtifact = {
  itemKey: string;
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
  metadata: Record<string, unknown>;
};

export type SpeechArtifactTarget =
  | {
      kind: "term";
      analysisItemId: string;
      script: string;
    }
  | {
      kind: "example_sentence";
      analysisItemId: string;
      exampleIndex: number;
      script: string;
    };

/** A synthesized artifact that still knows which pack item and script produced it. */
export type GeneratedSpeechArtifact = GeneratedBinaryArtifact & {
  target: SpeechArtifactTarget;
};
