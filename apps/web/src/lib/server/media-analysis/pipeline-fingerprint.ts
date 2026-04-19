import "server-only";

import { createHash } from "node:crypto";

import { env } from "@/lib/env";
import {
  MEDIA_ANALYSIS_CHUNKING_VERSION,
  MEDIA_ANALYSIS_LLM_PROMPT_VERSION,
  MEDIA_ANALYSIS_LLM_SCHEMA_VERSION,
  MEDIA_ANALYSIS_NLP_PIPELINE_VERSION,
  MEDIA_ANALYSIS_NORMALIZATION_VERSION,
} from "@/lib/server/media-analysis/contracts";

export type MediaAnalysisPipelineDescriptor = {
  nlpPipelineVersion: string;
  analysisLlmPipelineVersion: string;
  analysisLlmPromptVersion: string;
  analysisLlmSchemaVersion: string;
  normalizationVersion: string;
  chunkingVersion: string;
  analysisLlmModel: string;
};

function stableSortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableSortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, stableSortValue(nestedValue)]),
    );
  }

  return value;
}

export function buildMediaAnalysisPipelineDescriptor(
  overrides: Partial<MediaAnalysisPipelineDescriptor> = {},
): MediaAnalysisPipelineDescriptor {
  const descriptor: MediaAnalysisPipelineDescriptor = {
    nlpPipelineVersion: MEDIA_ANALYSIS_NLP_PIPELINE_VERSION,
    analysisLlmPipelineVersion: `gemini-analysis:${env.ANALYSIS_LLM_MODEL}`,
    analysisLlmPromptVersion: MEDIA_ANALYSIS_LLM_PROMPT_VERSION,
    analysisLlmSchemaVersion: MEDIA_ANALYSIS_LLM_SCHEMA_VERSION,
    normalizationVersion: MEDIA_ANALYSIS_NORMALIZATION_VERSION,
    chunkingVersion: MEDIA_ANALYSIS_CHUNKING_VERSION,
    analysisLlmModel: env.ANALYSIS_LLM_MODEL,
    ...overrides,
  };

  return stableSortValue(descriptor) as MediaAnalysisPipelineDescriptor;
}

export function computeMediaAnalysisPipelineFingerprint(
  overrides: Partial<MediaAnalysisPipelineDescriptor> = {},
) {
  const descriptor = buildMediaAnalysisPipelineDescriptor(overrides);
  const hash = createHash("sha256").update(JSON.stringify(descriptor)).digest("hex");

  return {
    descriptor,
    fingerprint: `media-analysis:${hash}`,
  };
}
