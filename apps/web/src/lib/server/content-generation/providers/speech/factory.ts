import "server-only";

import { createAwsPollySpeechAdapter } from "@/lib/server/content-generation/providers/speech/adapters/aws-polly";
import { createAzureMaiSpeechAdapter } from "@/lib/server/content-generation/providers/speech/adapters/azure-mai";
import type {
  ActiveSpeechProviderConfig,
  SpeechSynthesisAdapter,
} from "@/lib/server/content-generation/providers/speech/port";

function assertNever(value: never): never {
  throw new Error(`Unsupported speech provider: ${String(value)}`);
}

export function createSpeechSynthesisAdapter(
  config: ActiveSpeechProviderConfig,
): SpeechSynthesisAdapter {
  switch (config.provider) {
    case "aws-polly":
      return createAwsPollySpeechAdapter(config);
    case "azure-mai":
      return createAzureMaiSpeechAdapter(config);
    default:
      return assertNever(config);
  }
}
