import "server-only";

import type { AzureFoundryCredentials } from "@/lib/server/ai-credentials/types";

export type ImageGenerationProviderConfig = {
  provider: "azure-foundry";
  model: string;
  credentials: AzureFoundryCredentials;
};

export type ImageGenerationResult = {
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
  metadata: Record<string, unknown>;
};

export type ImageGenerationAdapter = {
  provider: ImageGenerationProviderConfig["provider"];
  generate: (request: { prompt: string }) => Promise<ImageGenerationResult>;
};
