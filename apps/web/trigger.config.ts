import { syncEnvVars } from "@trigger.dev/build/extensions/core";
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_qpgbqecphwssvcxveuls",
  dirs: ["./src/trigger"],
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 1,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 10_000,
      factor: 2,
      randomize: false,
    },
  },
  maxDuration: 3_600,
  build: {
    extensions: [
      syncEnvVars(async (_ctx) => {
        const varsToSync = [
          "DATABASE_URL",
          "GOOGLE_CLOUD_API_KEY",
          "OPENSUBTITLES_API_KEY",
          "OPENSUBTITLES_USERNAME",
          "OPENSUBTITLES_PASSWORD",
          "TMDB_API_KEY",
          "NLP_SERVICE_BASE_URL",
          "NLP_SERVICE_API_KEY",
          "R2_ACCESS_KEY_ID",
          "R2_SECRET_ACCESS_KEY",
          "R2_BUCKET_NAME",
          "R2_ENDPOINT",
          "R2_PUBLIC_BASE_URL",
          "AZURE_SPEECH_API_KEY",
          "AZURE_SPEECH_REGION",
          "AZURE_SPEECH_CONCURRENCY",
          "AZURE_SPEECH_MAX_RETRIES",
          "AZURE_MAI_VOICE_MALE",
          "AZURE_MAI_VOICE_FEMALE",
          "AZURE_MAI_VOICE_STYLE",
          "AWS_POLLY_ACCESS_KEY_ID",
          "AWS_POLLY_SECRET_ACCESS_KEY",
          "AWS_POLLY_REGION",
          "AWS_POLLY_ENGINE",
          "AWS_POLLY_STANDARD_VOICE_ID",
          "AWS_POLLY_NEURAL_VOICE_ID",
          "AWS_POLLY_CONCURRENCY",
          "AWS_POLLY_MAX_RETRIES",
          "CONTENT_GENERATION_AUDIO_PROVIDER",
          "CONTENT_GENERATION_AUDIO_VOICE",
          "CONTENT_GENERATION_TEXT_MODEL",
          "ANALYSIS_LLM_MODEL",
          "TEXT_LLM_PROVIDER",
          "AZURE_AI_FOUNDRY_ENDPOINT",
          "AZURE_AI_FOUNDRY_API_KEY",
          "AZURE_AI_FOUNDRY_MODEL",
        ];

        return varsToSync
          .map((name) => ({ name, value: process.env[name] }))
          .filter((v): v is { name: string; value: string } => v.value !== undefined);
      }),
    ],
  },
});
