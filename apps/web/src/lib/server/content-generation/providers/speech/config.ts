import "server-only";

import { env } from "@/lib/config/env";
import type { SpeechProviderConfig } from "@/lib/server/content-generation/providers/speech/port";

export function getSpeechProviderConfig(voiceGender?: "female" | "male"): SpeechProviderConfig {
  const normalizedVoiceGender = voiceGender === "male" ? "male" : "female";

  switch (env.CONTENT_GENERATION_AUDIO_PROVIDER) {
    case "disabled":
      return { provider: "disabled" };
    case "aws-polly":
      return {
        provider: "aws-polly",
        voice: normalizedVoiceGender === "male" ? "Matthew" : "Joanna",
        engine: env.AWS_POLLY_ENGINE,
      };
    case "azure-mai":
      return {
        provider: "azure-mai",
        voice:
          normalizedVoiceGender === "male" ? env.AZURE_MAI_VOICE_MALE : env.AZURE_MAI_VOICE_FEMALE,
        style: env.AZURE_MAI_VOICE_STYLE,
      };
  }
}
