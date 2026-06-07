import "server-only";

import { createAzureFoundryTextAdapter } from "@/lib/server/content-generation/providers/text/adapters/azure-foundry";
import { createGeminiTextAdapter } from "@/lib/server/content-generation/providers/text/adapters/gemini";
import type {
  TextGenerationAdapter,
  TextGenerationProviderConfig,
} from "@/lib/server/content-generation/providers/text/port";

function assertNever(value: never): never {
  throw new Error(`Unsupported text generation provider: ${String(value)}`);
}

export function createTextGenerationAdapter(
  config: TextGenerationProviderConfig,
): TextGenerationAdapter {
  switch (config.provider) {
    case "gemini":
      return createGeminiTextAdapter(config.credentials);
    case "azure-foundry":
      return createAzureFoundryTextAdapter(config.credentials);
    default:
      return assertNever(config);
  }
}
