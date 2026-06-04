import "server-only";

import { createAzureFoundryImageAdapter } from "@/lib/server/content-generation/providers/image/adapters/azure-foundry";
import type {
  ImageGenerationAdapter,
  ImageGenerationProviderConfig,
} from "@/lib/server/content-generation/providers/image/port";

function assertNever(value: never): never {
  throw new Error(`Unsupported image generation provider: ${String(value)}`);
}

export function createImageGenerationAdapter(
  config: ImageGenerationProviderConfig,
): ImageGenerationAdapter {
  switch (config.provider) {
    case "azure-foundry":
      return createAzureFoundryImageAdapter(config);
    default:
      // Single-member config union: narrow on the discriminant so the guard type-checks.
      return assertNever(config.provider);
  }
}
