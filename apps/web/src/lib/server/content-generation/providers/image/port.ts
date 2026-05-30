import "server-only";

export type ImageGenerationProviderConfig = {
  provider: "azure-foundry";
  model: string;
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
