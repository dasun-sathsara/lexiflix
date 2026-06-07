import "server-only";

import { AzureOpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { AzureFoundryCredentials } from "@/lib/server/ai-credentials/types";
import type { TextGenerationAdapter } from "@/lib/server/content-generation/providers/text/port";
import { generatedTextBatchSchema } from "@/lib/server/content-generation/providers/text/schema";

function createOpenAIClient(input: {
  credentials: AzureFoundryCredentials;
  deployment: string;
}): AzureOpenAI {
  if (!input.credentials.apiKey || !input.credentials.endpoint) {
    throw new Error("Azure AI Foundry credentials (endpoint and API key) are not configured.");
  }

  // Clients are created per request rather than cached, because credentials vary per user.
  return new AzureOpenAI({
    apiKey: input.credentials.apiKey,
    endpoint: input.credentials.endpoint,
    apiVersion: "2024-05-01-preview",
    deployment: input.deployment,
  });
}

export function createAzureFoundryTextAdapter(
  credentials: AzureFoundryCredentials,
): TextGenerationAdapter {
  return {
    provider: "azure-foundry",
    async generateBatch(request) {
      const client = createOpenAIClient({ credentials, deployment: request.model });
      const response = await client.chat.completions.create({
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
