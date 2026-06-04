import "server-only";

export type AnalysisLlmProviderConfig =
  | {
      provider: "gemini";
      model: string;
    }
  | {
      provider: "azure-foundry";
      model: string;
    };

export type AnalysisLlmChunkRequest = {
  model: string;
  prompt: string;
};

export type AnalysisLlmAdapter = {
  provider: AnalysisLlmProviderConfig["provider"];
  /** Returns the raw provider payload; the shared service validates it. */
  extractPhrases: (request: AnalysisLlmChunkRequest) => Promise<unknown>;
};
