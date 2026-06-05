import "server-only";

import { env } from "@/lib/config/env";
import { DEFAULT_AZURE_FOUNDRY_TEXT_MODEL } from "@/lib/constants";
import { createAnalysisLlmAdapter } from "@/lib/server/media-analysis/providers/analysis-llm/factory";
import type { AnalysisLlmProviderConfig } from "@/lib/server/media-analysis/providers/analysis-llm/port";
import {
  type AnalysisLlmResult,
  extractSubtitlePhrasesWithAdapter,
} from "@/lib/server/media-analysis/providers/analysis-llm/service";

export type {
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
 * Extracts reusable phrasal verbs, idioms and slang from raw subtitle text using the
 * configured analysis LLM. Windowing for the model context is handled internally.
 */
export async function extractSubtitlePhrases(input: {
  subtitleText: string;
}): Promise<AnalysisLlmResult> {
  const config = getAnalysisLlmConfig();
  const adapter = createAnalysisLlmAdapter(config);

  return extractSubtitlePhrasesWithAdapter({
    subtitleText: input.subtitleText,
    config,
    adapter,
  });
}
