import "server-only";

import { AzureOpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { env } from "@/lib/config/env";
import type { AnalysisLlmAdapter } from "@/lib/server/media-analysis/providers/analysis-llm/port";
import { analysisLlmResponseSchema } from "@/lib/server/media-analysis/providers/analysis-llm/schema";

let openaiClient: AzureOpenAI | null = null;

function getOpenAIClient(deployment: string): AzureOpenAI {
  if (openaiClient) {
    return openaiClient;
  }

  if (!env.AZURE_AI_FOUNDRY_API_KEY || !env.AZURE_AI_FOUNDRY_ENDPOINT) {
    throw new Error(
      "Azure AI Foundry credentials (AZURE_AI_FOUNDRY_API_KEY, AZURE_AI_FOUNDRY_ENDPOINT) are not configured.",
    );
  }

  openaiClient = new AzureOpenAI({
    apiKey: env.AZURE_AI_FOUNDRY_API_KEY,
    endpoint: env.AZURE_AI_FOUNDRY_ENDPOINT,
    apiVersion: "2024-05-01-preview",
    deployment,
  });

  return openaiClient;
}

export function createAzureFoundryAnalysisLlmAdapter(): AnalysisLlmAdapter {
  return {
    provider: "azure-foundry",
    async extractPhrases(request) {
      const response = await getOpenAIClient(request.model).chat.completions.create({
        model: request.model,
        messages: [{ role: "user", content: request.prompt }],
        response_format: zodResponseFormat(analysisLlmResponseSchema, "analysisLlmResponse"),
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        return { items: [] };
      }

      return JSON.parse(text);
    },
  };
}
