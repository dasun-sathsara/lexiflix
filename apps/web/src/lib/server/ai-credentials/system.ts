import "server-only";

import { env } from "@/lib/config/env";
import {
  DEFAULT_AZURE_FOUNDRY_IMAGE_MODEL,
  DEFAULT_AZURE_FOUNDRY_TEXT_MODEL,
} from "@/lib/constants";
import type {
  AwsPollyCredentials,
  AzureFoundryCredentials,
  AzureMaiCredentials,
  GeminiCredentials,
} from "@/lib/server/ai-credentials/types";

/**
 * System (`.env`) provider credentials. This is the single place where AI provider secrets are
 * read from the environment.
 */

export function getSystemGeminiCredentials(): GeminiCredentials | null {
  if (!env.GOOGLE_CLOUD_API_KEY) {
    return null;
  }

  // The system key is a Google Cloud key used through Vertex AI.
  return { apiKey: env.GOOGLE_CLOUD_API_KEY, useVertexAi: true };
}

export function getSystemAzureFoundryCredentials(): AzureFoundryCredentials | null {
  if (!env.AZURE_AI_FOUNDRY_API_KEY || !env.AZURE_AI_FOUNDRY_ENDPOINT) {
    return null;
  }

  return {
    apiKey: env.AZURE_AI_FOUNDRY_API_KEY,
    endpoint: env.AZURE_AI_FOUNDRY_ENDPOINT,
    model: env.AZURE_AI_FOUNDRY_MODEL ?? DEFAULT_AZURE_FOUNDRY_TEXT_MODEL,
    imageModel: env.CONTENT_GENERATION_IMAGE_MODEL ?? DEFAULT_AZURE_FOUNDRY_IMAGE_MODEL,
  };
}

export function getSystemAwsPollyCredentials(): AwsPollyCredentials | null {
  if (!env.AWS_POLLY_ACCESS_KEY_ID || !env.AWS_POLLY_SECRET_ACCESS_KEY) {
    return null;
  }

  return {
    accessKeyId: env.AWS_POLLY_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_POLLY_SECRET_ACCESS_KEY,
    region: env.AWS_POLLY_REGION,
  };
}

export function getSystemAzureMaiCredentials(): AzureMaiCredentials | null {
  if (!env.AZURE_SPEECH_API_KEY) {
    return null;
  }

  return { apiKey: env.AZURE_SPEECH_API_KEY, region: env.AZURE_SPEECH_REGION };
}

/** Which providers the operator has configured, for display in settings. */
export function getSystemCredentialAvailability() {
  return {
    gemini: getSystemGeminiCredentials() !== null,
    "azure-foundry": getSystemAzureFoundryCredentials() !== null,
    "aws-polly": getSystemAwsPollyCredentials() !== null,
    "azure-mai": getSystemAzureMaiCredentials() !== null,
  } as const;
}
