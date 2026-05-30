import "server-only";

import { logger } from "@trigger.dev/sdk";
import { env } from "@/lib/config/env";
import type {
  GeneratedBinaryArtifact,
  GeneratedTextItem,
} from "@/lib/server/content-generation/contracts";
import { createImageGenerationAdapter } from "@/lib/server/content-generation/providers/image/factory";
import type { ImageGenerationProviderConfig } from "@/lib/server/content-generation/providers/image/port";
import { generateImageArtifactsWithAdapter } from "@/lib/server/content-generation/providers/image/service";

function getImageGenerationConfig(): ImageGenerationProviderConfig {
  return {
    provider: "azure-foundry",
    model: env.CONTENT_GENERATION_IMAGE_PROVIDER ?? "gpt-image-2",
  };
}

export async function generateImageArtifacts(input: {
  textItems: GeneratedTextItem[];
}): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  const config = getImageGenerationConfig();

  try {
    const adapter = createImageGenerationAdapter(config);
    return await generateImageArtifactsWithAdapter({
      textItems: input.textItems,
      config,
      adapter,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[content-generation:image] Azure AI Foundry fatal integration failure", {
      error: errorMessage,
    });
    return {
      artifacts: [],
      warnings: [
        `Image generation bypassed: Azure AI Foundry integration failure (${errorMessage})`,
      ],
    };
  }
}
