import "server-only";

import { env } from "@/lib/config/env";
import { DEFAULT_AZURE_FOUNDRY_TEXT_MODEL } from "@/lib/constants";
import type { ResolvedAiCredentials } from "@/lib/server/ai-credentials/types";
import type {
  GenerationRequestSnapshot,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";
import { createTextGenerationAdapter } from "@/lib/server/content-generation/providers/text/factory";
import type { TextGenerationProviderConfig } from "@/lib/server/content-generation/providers/text/port";
import { generateTextContentWithAdapter } from "@/lib/server/content-generation/providers/text/service";

/**
 * The provider itself stays a server capability decision (env), while the credentials used to
 * call it can come from the learner's own configuration.
 */
function getTextGenerationConfig(
  aiCredentials: ResolvedAiCredentials,
): TextGenerationProviderConfig {
  switch (env.CONTENT_GENERATION_LLM_PROVIDER) {
    case "gemini": {
      const credentials = aiCredentials.gemini.credentials;
      if (!credentials) {
        throw new Error("No Gemini credentials are available for text generation.");
      }

      return {
        provider: "gemini",
        model: env.CONTENT_GENERATION_TEXT_MODEL,
        credentials,
      };
    }
    case "azure-foundry": {
      const credentials = aiCredentials.azureFoundry.credentials;
      if (!credentials) {
        throw new Error("No Azure AI Foundry credentials are available for text generation.");
      }

      return {
        provider: "azure-foundry",
        model: credentials.model ?? env.AZURE_AI_FOUNDRY_MODEL ?? DEFAULT_AZURE_FOUNDRY_TEXT_MODEL,
        credentials,
      };
    }
  }
}

export async function generateTextContent(input: {
  items: SelectedGenerationItem[];
  requestSnapshot: GenerationRequestSnapshot;
  aiCredentials: ResolvedAiCredentials;
}) {
  const config = getTextGenerationConfig(input.aiCredentials);
  const adapter = createTextGenerationAdapter(config);

  try {
    return await generateTextContentWithAdapter({
      items: input.items,
      requestSnapshot: input.requestSnapshot,
      config,
      adapter,
    });
  } catch (error) {
    const source =
      config.provider === "gemini"
        ? input.aiCredentials.gemini.source
        : input.aiCredentials.azureFoundry.source;

    if (source === "user") {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Text generation failed using your custom ${config.provider} credentials: ${message}`,
      );
    }

    throw error;
  }
}
