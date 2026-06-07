import "server-only";

import type { AwsPollyCredentials, AzureMaiCredentials } from "@/lib/server/ai-credentials/types";
import type { SpeechArtifactTarget } from "@/lib/server/content-generation/contracts";

export type SpeechProviderConfig =
  | {
      provider: "disabled";
    }
  | {
      provider: "aws-polly";
      voice: string;
      engine: "standard" | "neural";
      credentials: AwsPollyCredentials;
    }
  | {
      provider: "azure-mai";
      voice: string;
      style: string;
      credentials: AzureMaiCredentials;
    };

export type ActiveSpeechProviderConfig = Exclude<SpeechProviderConfig, { provider: "disabled" }>;

export type SpeechSynthesisResult = {
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
  requestCharacters?: number;
  metadata: Record<string, unknown>;
};

export type SpeechSynthesisAdapter = {
  provider: ActiveSpeechProviderConfig["provider"];
  voice: string;
  concurrency: number;
  synthesize: (target: SpeechArtifactTarget) => Promise<SpeechSynthesisResult>;
};
