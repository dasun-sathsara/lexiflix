import "server-only";

import { env } from "@/lib/config/env";
import { DEFAULT_AZURE_FOUNDRY_TEXT_MODEL } from "@/lib/constants";
import type {
  GenerationRequestSnapshot,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";
import { createTextGenerationAdapter } from "@/lib/server/content-generation/providers/text/factory";
import type { TextGenerationProviderConfig } from "@/lib/server/content-generation/providers/text/port";
import { generateTextContentWithAdapter } from "@/lib/server/content-generation/providers/text/service";

function getTextGenerationConfig(): TextGenerationProviderConfig {
  switch (env.TEXT_LLM_PROVIDER) {
    case "gemini":
      return {
        provider: "gemini",
        model: env.CONTENT_GENERATION_TEXT_MODEL,
      };
    case "azure-foundry":
      return {
        provider: "azure-foundry",
        model: env.AZURE_AI_FOUNDRY_MODEL ?? DEFAULT_AZURE_FOUNDRY_TEXT_MODEL,
      };
  }
}

export async function generateTextContent(input: {
  items: SelectedGenerationItem[];
  requestSnapshot: GenerationRequestSnapshot;
}) {
  const config = getTextGenerationConfig();
  const adapter = createTextGenerationAdapter(config);

  return generateTextContentWithAdapter({
    ...input,
    config,
    adapter,
  });
}
