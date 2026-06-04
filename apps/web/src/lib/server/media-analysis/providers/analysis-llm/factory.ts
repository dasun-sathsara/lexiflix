import "server-only";

import { createAzureFoundryAnalysisLlmAdapter } from "@/lib/server/media-analysis/providers/analysis-llm/adapters/azure-foundry";
import { createGeminiAnalysisLlmAdapter } from "@/lib/server/media-analysis/providers/analysis-llm/adapters/gemini";
import type {
  AnalysisLlmAdapter,
  AnalysisLlmProviderConfig,
} from "@/lib/server/media-analysis/providers/analysis-llm/port";

function assertNever(value: never): never {
  throw new Error(`Unsupported analysis LLM provider: ${String(value)}`);
}

export function createAnalysisLlmAdapter(config: AnalysisLlmProviderConfig): AnalysisLlmAdapter {
  switch (config.provider) {
    case "gemini":
      return createGeminiAnalysisLlmAdapter();
    case "azure-foundry":
      return createAzureFoundryAnalysisLlmAdapter();
    default:
      return assertNever(config);
  }
}
