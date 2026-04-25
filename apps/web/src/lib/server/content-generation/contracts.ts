import { z } from "zod";
import type {
  GenerationCefrWindowMode,
  GenerationKnownTermHandling,
  StoredCefrLevel,
  StoredFrequencyPreference,
  StoredVocabularyKind,
} from "@/lib/server/db/json-contracts";

export const CONTENT_GENERATION_PIPELINE_VERSION = "content-generation-v1";
export const CONTENT_GENERATION_TEXT_PROMPT_VERSION = "content-generation-text-v1";
export const CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH = 1200;

export const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const vocabularyKinds = ["word", "phrasal_verb", "idiom", "slang"] as const;

export const generationRequestSchema = z.object({
  learnerCefrLevel: z.enum(cefrLevels).nullable(),
  frequencyPreference: z.enum(["balanced", "common_first", "challenge_first"]).default("balanced"),
  selectedVocabularyTypes: z
    .array(z.enum(vocabularyKinds))
    .min(1)
    .default([...vocabularyKinds]),
  cefrWindowMode: z
    .enum(["same_level", "one_level_above", "all_levels_above"])
    .default("same_level"),
  packSize: z.number().int().positive().max(100).default(20),
  knownTermHandling: z
    .enum(["exclude_known", "downrank_known", "include_known"])
    .default("exclude_known"),
  exampleSentenceCount: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
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

export type EffectiveGenerationCapabilities = {
  textProvider: "gemini";
  textMode: "live" | "record" | "replay" | "mock";
  textModel: string;
  audioGenerationEnabled: boolean;
  audioMode: "live" | "replay" | "mock" | "disabled";
  audioProvider: string;
  audioVoice: string;
  imageGenerationEnabled: boolean;
  imageSelectionMode: "eligible_items";
  imageMode: "live" | "replay" | "mock" | "disabled";
  imageProvider: string;
  imageConcurrency: number;
};

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
  contexts: Array<{ text: string }>;
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
