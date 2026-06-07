import "server-only";

import { logger } from "@trigger.dev/sdk";

import { getAiCredentialEncryptionKey } from "@/lib/server/ai-credentials/encryption-key";
import { chooseCredentialSource } from "@/lib/server/ai-credentials/policy";
import {
  getEnforceSystemCredentials,
  listUserAiCredentials,
} from "@/lib/server/ai-credentials/store";
import {
  getSystemAwsPollyCredentials,
  getSystemAzureFoundryCredentials,
  getSystemAzureMaiCredentials,
  getSystemGeminiCredentials,
} from "@/lib/server/ai-credentials/system";
import type {
  AiProviderId,
  AwsPollyCredentials,
  AzureFoundryCredentials,
  AzureMaiCredentials,
  GeminiCredentials,
  ResolvedAiCredentials,
  ResolvedCredential,
  StoredAiCredential,
} from "@/lib/server/ai-credentials/types";
import { decryptSecret } from "@/lib/server/security/secret-box";

function decrypt(row: StoredAiCredential): string | null {
  try {
    return decryptSecret(row.secretCiphertext, getAiCredentialEncryptionKey());
  } catch (error) {
    logger.warn("[ai-credentials] could not decrypt stored credential; using system credentials", {
      provider: row.provider,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function toUserCredentials(row: StoredAiCredential | undefined, provider: AiProviderId) {
  if (!row || !row.enabled || row.provider !== provider) {
    return null;
  }

  const secret = decrypt(row);
  return secret ? { secret, metadata: row.metadata } : null;
}

function resolve<T>(input: {
  enforceSystemCredentials: boolean;
  userCredentials: T | null;
  systemCredentials: T | null;
}): ResolvedCredential<T> {
  const source = chooseCredentialSource({
    enforceSystemCredentials: input.enforceSystemCredentials,
    hasUsableUserCredential: input.userCredentials !== null,
  });

  return {
    source,
    credentials: source === "user" ? input.userCredentials : input.systemCredentials,
  };
}

/**
 * Resolves the effective AI provider credentials for a learner's own pack generation.
 *
 * Shared, content-scoped work (subtitle analysis) intentionally does not use this resolver:
 * its output is reused by every user, so it always runs on system credentials.
 */
export async function resolveAiCredentialsForUser(userId: string): Promise<ResolvedAiCredentials> {
  const [enforceSystemCredentials, rows] = await Promise.all([
    getEnforceSystemCredentials(),
    listUserAiCredentials(userId),
  ]);

  const byProvider = new Map<AiProviderId, StoredAiCredential>(
    rows.map((row) => [row.provider, row]),
  );

  const geminiUser = toUserCredentials(byProvider.get("gemini"), "gemini");
  const foundryUser = toUserCredentials(byProvider.get("azure-foundry"), "azure-foundry");
  const pollyUser = toUserCredentials(byProvider.get("aws-polly"), "aws-polly");
  const maiUser = toUserCredentials(byProvider.get("azure-mai"), "azure-mai");

  const systemFoundry = getSystemAzureFoundryCredentials();
  const systemPolly = getSystemAwsPollyCredentials();
  const systemMai = getSystemAzureMaiCredentials();

  const userGemini: GeminiCredentials | null = geminiUser
    ? // Learner-supplied keys are Google AI Studio keys, not Vertex AI project keys.
      { apiKey: geminiUser.secret, useVertexAi: false }
    : null;

  const userFoundry: AzureFoundryCredentials | null = foundryUser?.metadata.endpoint
    ? {
        apiKey: foundryUser.secret,
        endpoint: foundryUser.metadata.endpoint,
        model: foundryUser.metadata.model ?? systemFoundry?.model ?? null,
        imageModel: foundryUser.metadata.imageModel ?? systemFoundry?.imageModel ?? null,
      }
    : null;

  const userPolly: AwsPollyCredentials | null = pollyUser?.metadata.accessKeyId
    ? {
        accessKeyId: pollyUser.metadata.accessKeyId,
        secretAccessKey: pollyUser.secret,
        region: pollyUser.metadata.region ?? systemPolly?.region ?? "us-east-1",
      }
    : null;

  const userMai: AzureMaiCredentials | null = maiUser
    ? {
        apiKey: maiUser.secret,
        region: maiUser.metadata.region ?? systemMai?.region ?? "eastus2",
      }
    : null;

  return {
    enforceSystemCredentials,
    gemini: resolve({
      enforceSystemCredentials,
      userCredentials: userGemini,
      systemCredentials: getSystemGeminiCredentials(),
    }),
    azureFoundry: resolve({
      enforceSystemCredentials,
      userCredentials: userFoundry,
      systemCredentials: systemFoundry,
    }),
    awsPolly: resolve({
      enforceSystemCredentials,
      userCredentials: userPolly,
      systemCredentials: systemPolly,
    }),
    azureMai: resolve({
      enforceSystemCredentials,
      userCredentials: userMai,
      systemCredentials: systemMai,
    }),
  };
}

/** System-only resolution, used by shared/content-scoped pipelines. */
export function resolveSystemAiCredentials(): ResolvedAiCredentials {
  return {
    enforceSystemCredentials: true,
    gemini: { source: "system", credentials: getSystemGeminiCredentials() },
    azureFoundry: { source: "system", credentials: getSystemAzureFoundryCredentials() },
    awsPolly: { source: "system", credentials: getSystemAwsPollyCredentials() },
    azureMai: { source: "system", credentials: getSystemAzureMaiCredentials() },
  };
}
