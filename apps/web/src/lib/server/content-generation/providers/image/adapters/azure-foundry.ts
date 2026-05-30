import "server-only";

import { AzureOpenAI } from "openai";
import { env } from "@/lib/config/env";
import type {
  ImageGenerationAdapter,
  ImageGenerationProviderConfig,
} from "@/lib/server/content-generation/providers/image/port";

const IMAGE_SIZE = "1792x1024" as const;

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

export function createAzureFoundryImageAdapter(
  config: ImageGenerationProviderConfig,
): ImageGenerationAdapter {
  const openai = createOpenAIClient(config.model);

  return {
    provider: "azure-foundry",
    async generate(request) {
      const response = await openai.images.generate({
        model: config.model,
        prompt: request.prompt,
        n: 1,
        size: IMAGE_SIZE,
      });
      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("No image data returned from Azure AI Foundry.");
      }

      return {
        bytes: new Uint8Array(Buffer.from(b64, "base64")),
        mimeType: "image/png",
        extension: "png",
        metadata: {
          provider: "azure-foundry",
          model: config.model,
          size: IMAGE_SIZE,
        },
      };
    },
  };
}
