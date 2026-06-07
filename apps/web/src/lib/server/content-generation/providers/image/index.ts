import "server-only";

import { logger } from "@trigger.dev/sdk";
import { env } from "@/lib/config/env";
import { DEFAULT_AZURE_FOUNDRY_IMAGE_MODEL } from "@/lib/constants";
import type { ResolvedAiCredentials } from "@/lib/server/ai-credentials/types";
import type {
  GeneratedTextItem,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";
import { createImageGenerationAdapter } from "@/lib/server/content-generation/providers/image/factory";
import type { ImageGenerationProviderConfig } from "@/lib/server/content-generation/providers/image/port";
import {
  generateImageArtifactsWithAdapter,
  type ImageArtifactsResult,
  selectImageEligibleItems,
} from "@/lib/server/content-generation/providers/image/service";

export type { ImageArtifactsResult } from "@/lib/server/content-generation/providers/image/service";

function getImageGenerationConfig(
  aiCredentials: ResolvedAiCredentials,
): ImageGenerationProviderConfig {
  const credentials = aiCredentials.azureFoundry.credentials;
  if (!credentials) {
    throw new Error("No Azure AI Foundry credentials are available for image generation.");
  }

  return {
    provider: "azure-foundry",
    model:
      credentials.imageModel ??
      env.CONTENT_GENERATION_IMAGE_MODEL ??
      DEFAULT_AZURE_FOUNDRY_IMAGE_MODEL,
    credentials,
  };
}

/** Only single words get visual cues; phrases, idioms and slang are text-only. */
function selectWordItems(input: {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
}) {
  const wordItemIds = new Set(
    input.selectedItems.filter((item) => item.kind === "word").map((item) => item.analysisItemId),
  );

  return input.textItems.filter((item) => wordItemIds.has(item.analysisItemId));
}

export async function generateImageArtifacts(input: {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
  /** Learner-facing toggle from the generation request. */
  requested: boolean;
  aiCredentials: ResolvedAiCredentials;
}): Promise<ImageArtifactsResult> {
  if (!env.CONTENT_GENERATION_IMAGE_ENABLED || !input.requested) {
    return { artifacts: [], warnings: [] };
  }

  const candidateItems = selectWordItems(input);
  if (selectImageEligibleItems(candidateItems).length === 0) {
    return { artifacts: [], warnings: [] };
  }

  try {
    const config = getImageGenerationConfig(input.aiCredentials);
    const adapter = createImageGenerationAdapter(config);
    return await generateImageArtifactsWithAdapter({
      textItems: candidateItems,
      config,
      adapter,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const credentialLabel =
      input.aiCredentials.azureFoundry.source === "user"
        ? "your custom Azure AI Foundry"
        : "Azure AI Foundry";
    logger.error("[content-generation:image] Azure AI Foundry fatal integration failure", {
      error: errorMessage,
      credentialSource: input.aiCredentials.azureFoundry.source,
    });
    return {
      artifacts: [],
      warnings: [
        `Image generation bypassed: ${credentialLabel} integration failure (${errorMessage})`,
      ],
    };
  }
}
