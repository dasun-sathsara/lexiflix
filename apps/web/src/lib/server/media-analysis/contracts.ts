import "server-only";

import { z } from "zod";

import type { NlpCandidateContext, StoredCefrLevel } from "@/lib/server/db/json-contracts";

export const storedCefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const analysisLlmKinds = ["phrasal_verb", "idiom", "slang"] as const;
export const analysisLlmExecutionModes = ["live", "record", "replay", "mock"] as const;
export const contentAnalysisRunStatuses = ["queued", "running", "completed", "failed"] as const;
export const contentAnalysisFailureCodes = [
  "INVALID_RUN",
  "NO_SUBTITLES",
  "SUBTITLE_FETCH_FAILED",
  "NLP_SERVICE_FAILED",
  "ANALYSIS_LLM_FAILED",
  "WORKFLOW_TRIGGER_FAILED",
  "PERSISTENCE_FAILED",
] as const;
export const contentAnalysisStages = [
  "queued",
  "fetching_subtitles",
  "running_nlp",
  "running_llm",
  "merging_analysis",
  "saving_analysis",
  "completed",
  "failed",
] as const;

export type AnalysisLlmKind = (typeof analysisLlmKinds)[number];
export type AnalysisLlmExecutionMode = (typeof analysisLlmExecutionModes)[number];
export type ContentAnalysisRunStatus = (typeof contentAnalysisRunStatuses)[number];
export type ContentAnalysisFailureCode = (typeof contentAnalysisFailureCodes)[number];
export type ContentAnalysisStage = (typeof contentAnalysisStages)[number];

export const MEDIA_ANALYSIS_NORMALIZATION_VERSION = "media-analysis-normalization-v1";
export const MEDIA_ANALYSIS_CHUNKING_VERSION = "media-analysis-chunking-v3";
export const MEDIA_ANALYSIS_NLP_PIPELINE_VERSION = "nlp-service-v1";
export const MEDIA_ANALYSIS_LLM_PROMPT_VERSION = "media-analysis-phrases-v1";
export const MEDIA_ANALYSIS_LLM_SCHEMA_VERSION = "media-analysis-phrases-schema-v1";

const cefrSchema = z.enum(storedCefrLevels);

export const nlpAnalysisOptionsSchema = z.object({
  include_propn: z.boolean().default(false),
  dedup_lines: z.boolean().default(true),
  batch_size: z.number().int().min(1).max(10_000).default(200),
});

export const resolveContentTargetInputSchema = z.discriminatedUnion("mediaType", [
  z.object({
    mediaType: z.literal("movie"),
    tmdbId: z.number().int().positive(),
  }),
  z.object({
    mediaType: z.literal("tv"),
    tmdbId: z.number().int().positive(),
    seasonNumber: z.number().int().positive().optional(),
  }),
]);

export const contentAnalysisTransitionSchema = z.object({
  runId: z.string().min(1),
  status: z.enum(contentAnalysisRunStatuses),
  stage: z.enum(contentAnalysisStages),
  message: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  progressMessage: z.string().min(1).nullable().optional(),
  errorCode: z.string().min(1).nullable().optional(),
  errorMessage: z.string().min(1).nullable().optional(),
  startedAt: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  warnings: z.array(z.string()).nullable().optional(),
});

export const nlpAnalysisRequestSchema = z.object({
  job_id: z.string().min(1).nullable().optional(),
  content: z.string().min(1),
  content_type: z.enum(["srt", "plain_text"]).default("srt"),
  user_cefr_level: z.string().min(1).nullable().optional(),
  study_language: z.string().min(1).nullable().optional(),
  pipeline_version: z.string().min(1).nullable().optional(),
  options: nlpAnalysisOptionsSchema.default(() => ({
    include_propn: false,
    dedup_lines: true,
    batch_size: 200,
  })),
});

export const nlpCandidateContextSchema = z.object({
  text: z.string().min(1),
});

export const nlpVocabularyCandidateSchema = z.object({
  text: z.string().min(1),
  lemma: z.string().min(1),
  type: z.string().min(1),
  cefr_level: cefrSchema.nullable().optional(),
  cefr_numeric: z.number().int().min(1).max(6).nullable().optional(),
  count: z.number().int().min(1),
  contexts: z.array(nlpCandidateContextSchema).default([]),
  confidence: z.number().min(0).max(1).nullable().optional(),
  notes: z.string().min(1).nullable().optional(),
});

export const nlpAnalysisMetadataSchema = z.object({
  job_id: z.string().min(1).nullable().optional(),
  total_lines: z.number().int().min(0),
  total_characters: z.number().int().min(0),
  unique_candidates: z.number().int().min(0),
  spacy_model: z.string().min(1),
  pipeline_version: z.string().min(1).nullable().optional(),
});

export const nlpAnalysisResponseSchema = z.object({
  metadata: nlpAnalysisMetadataSchema,
  candidates: z.array(nlpVocabularyCandidateSchema),
  warnings: z.array(z.string()).default([]),
});

export const analysisLlmItemSchema = z.object({
  kind: z.enum(analysisLlmKinds),
  text: z.string().min(1),
  displayText: z.string().min(1),
  cefrLevel: cefrSchema.nullable().optional(),
  representativeContext: z.string().min(1).nullable().optional(),
  contexts: z.array(nlpCandidateContextSchema).default([]),
  rationale: z.string().min(1).nullable().optional(),
});

export const analysisLlmResponseSchema = z.object({
  items: z.array(analysisLlmItemSchema),
});

export const analysisLlmRecordingSchema = z.object({
  requestFingerprint: z.string().min(1),
  promptVersion: z.string().min(1),
  schemaVersion: z.string().min(1),
  model: z.string().min(1),
  recordedAt: z.string().min(1),
  response: analysisLlmResponseSchema,
});

export type NlpAnalysisRequest = z.infer<typeof nlpAnalysisRequestSchema>;
export type NlpAnalysisResponse = z.infer<typeof nlpAnalysisResponseSchema>;
export type AnalysisLlmItem = z.infer<typeof analysisLlmItemSchema>;
export type AnalysisLlmResponse = z.infer<typeof analysisLlmResponseSchema>;
export type AnalysisLlmRecording = z.infer<typeof analysisLlmRecordingSchema>;
export type ResolveContentTargetInput = z.infer<typeof resolveContentTargetInputSchema>;
export type ContentAnalysisTransitionInput = z.infer<typeof contentAnalysisTransitionSchema>;

export function cefrNumericFromLevel(level: StoredCefrLevel | null | undefined) {
  switch (level) {
    case "A1":
      return 1;
    case "A2":
      return 2;
    case "B1":
      return 3;
    case "B2":
      return 4;
    case "C1":
      return 5;
    case "C2":
      return 6;
    default:
      return null;
  }
}

export function toRepresentativeContexts(text: string | null | undefined): NlpCandidateContext[] {
  if (!text) {
    return [];
  }

  return [{ text }];
}
