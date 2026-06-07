import "server-only";

import type { AzureFoundryCredentials, GeminiCredentials } from "@/lib/server/ai-credentials/types";

export type TextGenerationProviderConfig =
  | {
      provider: "gemini";
      model: string;
      credentials: GeminiCredentials;
    }
  | {
      provider: "azure-foundry";
      model: string;
      credentials: AzureFoundryCredentials;
    };

export type TextBatchRequest = {
  model: string;
  prompt: string;
};

export type TextGenerationAdapter = {
  provider: TextGenerationProviderConfig["provider"];
  generateBatch: (request: TextBatchRequest) => Promise<unknown>;
};
