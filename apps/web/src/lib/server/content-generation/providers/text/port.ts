import "server-only";

export type TextGenerationProviderConfig =
  | {
      provider: "gemini";
      model: string;
    }
  | {
      provider: "azure-foundry";
      model: string;
    };

export type TextBatchRequest = {
  model: string;
  prompt: string;
};

export type TextGenerationAdapter = {
  provider: TextGenerationProviderConfig["provider"];
  generateBatch: (request: TextBatchRequest) => Promise<unknown>;
};
