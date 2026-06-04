import { z } from "zod";
import {
  CONTENT_GENERATION_PIPELINE_VERSION,
  CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH,
  CEFR_LEVELS as cefrLevels,
  DEFAULT_FREQUENCY_PREFERENCE,
  DEFAULT_GENERATION_AUDIO_VOICE_GENDER,
  DEFAULT_GENERATION_CEFR_WINDOW_MODE,
  DEFAULT_GENERATION_EXAMPLE_SENTENCE_COUNT,
  DEFAULT_GENERATION_KNOWN_TERM_HANDLING,
  DEFAULT_GENERATION_PACK_SIZE,
  FREQUENCY_PREFERENCES,
  GENERATION_CEFR_WINDOW_MODES,
  GENERATION_KNOWN_TERM_HANDLINGS,
  GENERATION_AUDIO_VOICE_GENDERS as generationAudioVoiceGenders,
  VOCABULARY_KINDS as vocabularyKinds,
} from "@/lib/constants";
import type { StoredCefrLevel, StoredVocabularyKind } from "@/lib/server/db/json-contracts";

export {
  CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH,
  CONTENT_GENERATION_PIPELINE_VERSION,
  cefrLevels,
  vocabularyKinds,
  generationAudioVoiceGenders,
};

export const generationRequestSchema = z.object({
  learnerCefrLevel: z.enum(cefrLevels).nullable(),
  frequencyPreference: z.enum(FREQUENCY_PREFERENCES).default(DEFAULT_FREQUENCY_PREFERENCE),
  selectedVocabularyTypes: z
    .array(z.enum(vocabularyKinds))
    .min(1)
    .default([...vocabularyKinds]),
  cefrWindowMode: z.enum(GENERATION_CEFR_WINDOW_MODES).default(DEFAULT_GENERATION_CEFR_WINDOW_MODE),
  packSize: z.number().int().positive().default(DEFAULT_GENERATION_PACK_SIZE),
  knownTermHandling: z
    .enum(GENERATION_KNOWN_TERM_HANDLINGS)
    .default(DEFAULT_GENERATION_KNOWN_TERM_HANDLING),
  audioVoiceGender: z
    .enum(generationAudioVoiceGenders)
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
export type ContentGenerationStage =
  | "queued"
  | "selecting_terms"
  | "generating_content"
  | "generating_assets"
  | "saving_pack"
  | "completed"
  | "failed";

export type SelectedGenerationItem = {
  analysisItemId: string;
  termId: string;
  kind: StoredVocabularyKind;
  displayText: string;
  surfaceForm: string;
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
