import "server-only";

import { AzureOpenAI } from "openai";
import type {
  ImageGenerationAdapter,
  ImageGenerationProviderConfig,
} from "@/lib/server/content-generation/providers/image/port";

const IMAGE_SIZE = "1792x1024" as const;

function createOpenAIClient(config: ImageGenerationProviderConfig): AzureOpenAI {
  if (!config.credentials.endpoint || !config.credentials.apiKey) {
    throw new Error("Azure AI Foundry credentials (endpoint and API key) are not configured.");
  }

  // Created per adapter instance because credentials vary per user.
  return new AzureOpenAI({
    endpoint: config.credentials.endpoint,
    apiKey: config.credentials.apiKey,
    apiVersion: "2024-05-01-preview",
    deployment: config.model,
  });
}

export function createAzureFoundryImageAdapter(
  config: ImageGenerationProviderConfig,
): ImageGenerationAdapter {
  const openai = createOpenAIClient(config);

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
