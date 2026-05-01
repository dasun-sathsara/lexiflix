import "server-only";

import { z } from "zod";

export const storedCefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const analysisLlmKinds = ["phrasal_verb", "idiom", "slang"] as const;
export const contentAnalysisRunStatuses = ["queued", "running", "completed", "failed"] as const;
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
export type ContentAnalysisRunStatus = (typeof contentAnalysisRunStatuses)[number];
export type ContentAnalysisStage = (typeof contentAnalysisStages)[number];

export const MEDIA_ANALYSIS_PIPELINE_VERSION = "media-analysis-v1";

const cefrSchema = z.enum(storedCefrLevels);

export const nlpAnalysisOptionsSchema = z.object({
  include_propn: z.boolean().default(false),
  dedup_lines: z.boolean().default(true),
  batch_size: z.number().int().min(1).max(10_000).default(200),
});

export const resolveContentTargetInputSchema = z.object({
  mediaType: z.enum(["movie", "tv"]),
  tmdbId: z.number().int().positive(),
  seasonNumber: z.number().int().positive().optional(),
});

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

export type NlpAnalysisRequest = z.infer<typeof nlpAnalysisRequestSchema>;
export type NlpAnalysisResponse = z.infer<typeof nlpAnalysisResponseSchema>;
export type AnalysisLlmItem = z.infer<typeof analysisLlmItemSchema>;
export type AnalysisLlmResponse = z.infer<typeof analysisLlmResponseSchema>;
export type ResolveContentTargetInput = z.infer<typeof resolveContentTargetInputSchema>;
export type ContentAnalysisTransitionInput = z.infer<typeof contentAnalysisTransitionSchema>;

const CEFR_TO_NUMERIC: Record<string, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

export const cefrNumericFromLevel = (level: string | null | undefined) =>
  CEFR_TO_NUMERIC[level ?? ""] ?? null;
