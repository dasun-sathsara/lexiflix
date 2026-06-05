import "server-only";

import { env } from "@/lib/config/env";
import { DEFAULT_AZURE_FOUNDRY_TEXT_MODEL } from "@/lib/constants";
import { createAnalysisLlmAdapter } from "@/lib/server/media-analysis/providers/analysis-llm/factory";
import type { AnalysisLlmProviderConfig } from "@/lib/server/media-analysis/providers/analysis-llm/port";
import {
  type AnalysisLlmChunk,
  type AnalysisLlmResult,
  extractSubtitlePhrasesWithAdapter,
} from "@/lib/server/media-analysis/providers/analysis-llm/service";

export type {
  AnalysisLlmChunk,
  AnalysisLlmPhrase,
  AnalysisLlmResult,
} from "@/lib/server/media-analysis/providers/analysis-llm/service";

function getAnalysisLlmConfig(): AnalysisLlmProviderConfig {
  switch (env.ANALYSIS_LLM_PROVIDER) {
    case "gemini":
      return {
        provider: "gemini",
        model: env.ANALYSIS_LLM_MODEL,
      };
    case "azure-foundry":
      return {
        provider: "azure-foundry",
        model: env.AZURE_AI_FOUNDRY_MODEL ?? DEFAULT_AZURE_FOUNDRY_TEXT_MODEL,
      };
  }
}

/**
 * Extracts reusable phrasal verbs, idioms and slang from subtitle chunks using the
 * configured analysis LLM.
 */
export async function extractSubtitlePhrases(input: {
  chunks: AnalysisLlmChunk[];
}): Promise<AnalysisLlmResult> {
  const config = getAnalysisLlmConfig();
  const adapter = createAnalysisLlmAdapter(config);

  return extractSubtitlePhrasesWithAdapter({
    chunks: input.chunks,
    config,
    adapter,
  });
}
