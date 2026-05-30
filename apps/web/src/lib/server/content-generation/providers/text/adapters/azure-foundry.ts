import "server-only";

import { AzureOpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { env } from "@/lib/config/env";
import type { TextGenerationAdapter } from "@/lib/server/content-generation/providers/text/port";
import { generatedTextBatchSchema } from "@/lib/server/content-generation/providers/text/schema";

let openaiClient: AzureOpenAI | null = null;

function getOpenAIClient(): AzureOpenAI {
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
    deployment: env.AZURE_AI_FOUNDRY_MODEL ?? "gpt-5.6-luna",
  });

  return openaiClient;
}

export function createAzureFoundryTextAdapter(): TextGenerationAdapter {
  return {
    provider: "azure-foundry",
    async generateBatch(request) {
      const response = await getOpenAIClient().chat.completions.create({
        model: request.model,
        messages: [{ role: "user", content: request.prompt }],
        response_format: zodResponseFormat(generatedTextBatchSchema, "generatedTextBatch"),
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error("Azure AI Foundry returned empty content.");
      }

      return JSON.parse(text);
    },
  };
}
