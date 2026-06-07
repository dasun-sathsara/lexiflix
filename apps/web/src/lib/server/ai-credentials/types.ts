/**
 * Provider credential contracts shared by the settings UI, the credential store and the
 * content-generation providers. Pure types only — safe to import from schema and client code
 * (metadata never contains secret values).
 */

export const AI_PROVIDER_IDS = ["gemini", "azure-foundry", "aws-polly", "azure-mai"] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export const AI_PROVIDER_LABELS: Record<AiProviderId, string> = {
  gemini: "Google Gemini",
  "azure-foundry": "Azure AI Foundry",
  "aws-polly": "AWS Polly",
  "azure-mai": "Azure MAI Speech",
};

/** Non-secret, provider-specific configuration stored alongside the encrypted secret. */
export type AiCredentialMetadata = {
  /** Azure AI Foundry resource endpoint. */
  endpoint?: string;
  /** Azure AI Foundry text deployment/model name. */
  model?: string;
  /** Azure AI Foundry image deployment/model name. */
  imageModel?: string;
  /** AWS Polly access key id (the secret access key is encrypted). */
  accessKeyId?: string;
  /** AWS or Azure region. */
  region?: string;
};

export type AiCredentialSource = "system" | "user";

export type GeminiCredentials = {
  apiKey: string;
  /**
   * System credentials are Google Cloud keys used through Vertex AI; user-supplied keys are
   * Google AI Studio keys and must use the standard Generative Language API.
   */
  useVertexAi: boolean;
};

export type AzureFoundryCredentials = {
  apiKey: string;
  endpoint: string;
  model: string | null;
  imageModel: string | null;
};

export type AwsPollyCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

export type AzureMaiCredentials = {
  apiKey: string;
  region: string;
};

export type ResolvedCredential<T> = {
  source: AiCredentialSource;
  credentials: T | null;
};

export type ResolvedAiCredentials = {
  /** True when an admin has forced every user onto the system `.env` configuration. */
  enforceSystemCredentials: boolean;
  gemini: ResolvedCredential<GeminiCredentials>;
  azureFoundry: ResolvedCredential<AzureFoundryCredentials>;
  awsPolly: ResolvedCredential<AwsPollyCredentials>;
  azureMai: ResolvedCredential<AzureMaiCredentials>;
};

/** Row shape returned by the credential store (secret still encrypted). */
export type StoredAiCredential = {
  provider: AiProviderId;
  secretCiphertext: string;
  secretHint: string;
  metadata: AiCredentialMetadata;
  enabled: boolean;
  updatedAt: Date;
};
