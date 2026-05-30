import "server-only";

import { logger } from "@trigger.dev/sdk";
import { AzureOpenAI } from "openai";
import { env } from "@/lib/config/env";
import type {
  GeneratedBinaryArtifact,
  GeneratedTextItem,
} from "@/lib/server/content-generation/contracts";

const IMAGE_SIZE = "1792x1024" as const;
const REQUEST_DELAY_MS = 10_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createOpenAIClient(deployment: string): AzureOpenAI {
  if (!env.AZURE_AI_FOUNDRY_ENDPOINT || !env.AZURE_AI_FOUNDRY_API_KEY) {
    throw new Error(
      "Azure AI Foundry credentials (AZURE_AI_FOUNDRY_ENDPOINT, AZURE_AI_FOUNDRY_API_KEY) are not configured.",
    );
  }

  return new AzureOpenAI({
    endpoint: env.AZURE_AI_FOUNDRY_ENDPOINT,
    apiKey: env.AZURE_AI_FOUNDRY_API_KEY,
    apiVersion: "2024-05-01-preview",
    deployment,
  });
}

export async function generateImageArtifacts(input: {
  textItems: GeneratedTextItem[];
  imageEnabled: boolean;
  imageProvider?: string;
}): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  if (!input.imageEnabled) {
    return { artifacts: [], warnings: [] };
  }

  const eligibleItems = input.textItems.filter(
    (item) => item.imageEligibility.eligible && Boolean(item.imageBrief?.trim()),
  );

  logger.info("[content-generation:image] started", {
    provider: input.imageProvider,
    totalItemCount: input.textItems.length,
    eligibleItemCount: eligibleItems.length,
  });

  if (eligibleItems.length === 0) {
    return { artifacts: [], warnings: [] };
  }

  const model = input.imageProvider ?? "gpt-image-2";
  const openai = createOpenAIClient(model);
  const artifacts: GeneratedBinaryArtifact[] = [];
  const warnings: string[] = [];

  for (const [index, item] of eligibleItems.entries()) {
    if (index > 0) {
      await delay(REQUEST_DELAY_MS);
    }

    logger.info(
      `[content-generation:image] generating image ${index + 1}/${eligibleItems.length}`,
      {
        analysisItemId: item.analysisItemId,
        termId: item.termId,
        brief: item.imageBrief,
      },
    );

    try {
      const response = await openai.images.generate({
        model,
        prompt: item.imageBrief as string,
        n: 1,
        size: IMAGE_SIZE,
      });
      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("No image data returned from Azure AI Foundry.");
      }

      artifacts.push({
        itemKey: item.analysisItemId,
        bytes: new Uint8Array(Buffer.from(b64, "base64")),
        mimeType: "image/png",
        extension: "png",
        metadata: {
          provider: "azure-foundry",
          model,
          size: IMAGE_SIZE,
          prompt: item.imageBrief,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("[content-generation:image] Azure AI Foundry item skipped", {
        analysisItemId: item.analysisItemId,
        errorMessage,
      });
      warnings.push(`Image skipped for '${item.analysisItemId}': ${errorMessage}`);
    }
  }

  return { artifacts, warnings };
}
