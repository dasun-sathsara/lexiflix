import { z } from "zod";

function formatEnvIssues(error: z.ZodError) {
  return error.issues.map((issue) => {
    const key = issue.path[0];
    const label = typeof key === "string" && key.length > 0 ? key : "ENV";

    if (issue.code === "invalid_type" && issue.input === undefined) {
      return `${label}: missing`;
    }

    return `${label}: ${issue.message}`;
  });
}

function reportEnvValidationIssues(scope: "client" | "server", error: z.ZodError) {
  const issues = formatEnvIssues(error);
  const heading = `\n[env] Invalid ${scope} environment variables`;
  const details = issues.map((issue) => `  - ${issue}`).join("\n");

  console.error(`${heading}\n${details}\n`);
}

function createEnvValidationError(scope: "client" | "server", error: z.ZodError) {
  reportEnvValidationIssues(scope, error);

  return new Error(`Invalid ${scope} environment variables. See log output above.`);
}

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z
    .string()
    .describe("Public base URL, e.g., https://lexiflix.app")
    .optional(),
  NEXT_PUBLIC_ENV: z
    .enum(["development", "test", "production"])
    .default(process.env.NODE_ENV as "development" | "test" | "production"),
});

const serverSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
    GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
    GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
    OPENSUBTITLES_API_KEY: z.string().min(1, "OPENSUBTITLES_API_KEY is required"),
    OPENSUBTITLES_USERNAME: z.string().min(1, "OPENSUBTITLES_USERNAME is required"),
    OPENSUBTITLES_PASSWORD: z.string().min(1, "OPENSUBTITLES_PASSWORD is required"),
    OPENSUBTITLES_API_BASE_URL: z
      .url("OPENSUBTITLES_API_BASE_URL must be a valid URL")
      .default("https://api.opensubtitles.com/api/v1"),
    OPENSUBTITLES_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive("OPENSUBTITLES_REQUEST_TIMEOUT_MS must be a positive integer")
      .default(20_000),
    RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
    R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
    R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
    R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME is required"),
    R2_ENDPOINT: z.string().min(1, "R2_ENDPOINT is required"),
    R2_PUBLIC_BASE_URL: z.url(
      "R2_PUBLIC_BASE_URL must be a valid URL, e.g. https://cdn.example.com",
    ),
    GOOGLE_CLOUD_API_KEY: z.string().min(1, "GOOGLE_CLOUD_API_KEY is required"),
    TRIGGER_SECRET_KEY: z.string().min(1, "TRIGGER_SECRET_KEY is required"),
    ANALYSIS_LLM_MODEL: z
      .string()
      .min(1, "ANALYSIS_LLM_MODEL must not be empty")
      .default("gemini-3.1-flash-lite"),
    CONTENT_GENERATION_TEXT_MODEL: z
      .string()
      .min(1, "CONTENT_GENERATION_TEXT_MODEL must not be empty")
      .default("gemini-3.1-flash-lite"),
    CONTENT_GENERATION_AUDIO_PROVIDER: z
      .enum(["disabled", "aws-polly", "azure-mai"])
      .default("azure-mai"),
    CONTENT_GENERATION_AUDIO_VOICE: z.string().min(1).default("lexiflix-v1"),
    AZURE_SPEECH_REGION: z.string().min(1).default("eastus2"),
    AZURE_SPEECH_API_KEY: z.string().min(1).optional(),
    AZURE_SPEECH_CONCURRENCY: z.coerce.number().int().positive().default(4),
    AZURE_SPEECH_MAX_RETRIES: z.coerce.number().int().nonnegative().default(2),
    AZURE_MAI_VOICE_MALE: z.string().min(1).default("en-US-Jasper:MAI-Voice-1"),
    AZURE_MAI_VOICE_FEMALE: z.string().min(1).default("en-US-June:MAI-Voice-1"),
    AZURE_MAI_VOICE_STYLE: z.string().min(1).default("learning"),
    AWS_POLLY_REGION: z.string().min(1).default("us-east-1"),
    AWS_POLLY_ACCESS_KEY_ID: z.string().min(1).optional(),
    AWS_POLLY_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    AWS_POLLY_ENGINE: z.enum(["standard", "neural"]).default("standard"),
    AWS_POLLY_STANDARD_VOICE_ID: z.string().min(1).default("Joanna"),
    AWS_POLLY_NEURAL_VOICE_ID: z.string().min(1).default("Matthew"),
    AWS_POLLY_CONCURRENCY: z.coerce.number().int().positive().default(5),
    AWS_POLLY_MAX_RETRIES: z.coerce.number().int().nonnegative().default(2),
    CONTENT_GENERATION_IMAGE_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    CONTENT_GENERATION_IMAGE_PROVIDER: z.string().min(1).optional(),
    CONTENT_GENERATION_IMAGE_CONCURRENCY: z.coerce.number().int().positive().default(3),
    NLP_SERVICE_BASE_URL: z.url("NLP_SERVICE_BASE_URL must be a valid URL"),
    NLP_SERVICE_API_KEY: z.string().min(1, "NLP_SERVICE_API_KEY is required"),
    NLP_SERVICE_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive("NLP_SERVICE_REQUEST_TIMEOUT_MS must be a positive integer")
      .default(60_000),
    TMDB_API_KEY: z.string().min(1, "TMDB_API_KEY is required"),
  })
  .superRefine((value, context) => {
    const pollyNeedsAwsCredentials = value.CONTENT_GENERATION_AUDIO_PROVIDER === "aws-polly";
    const azureNeedsSpeechCredentials = value.CONTENT_GENERATION_AUDIO_PROVIDER === "azure-mai";

    if (pollyNeedsAwsCredentials && !value.AWS_POLLY_ACCESS_KEY_ID) {
      context.addIssue({
        code: "custom",
        path: ["AWS_POLLY_ACCESS_KEY_ID"],
        message: "AWS_POLLY_ACCESS_KEY_ID is required when using aws-polly",
      });
    }

    if (pollyNeedsAwsCredentials && !value.AWS_POLLY_SECRET_ACCESS_KEY) {
      context.addIssue({
        code: "custom",
        path: ["AWS_POLLY_SECRET_ACCESS_KEY"],
        message: "AWS_POLLY_SECRET_ACCESS_KEY is required when using aws-polly",
      });
    }

    if (azureNeedsSpeechCredentials && !value.AZURE_SPEECH_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["AZURE_SPEECH_API_KEY"],
        message: "AZURE_SPEECH_API_KEY is required when using azure-mai",
      });
    }
  });

const isServer = typeof window === "undefined";

const clientRaw = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV as "development" | "test" | "production" | undefined,
};

const parsedClient = clientSchema.safeParse(clientRaw);
if (!parsedClient.success) {
  throw createEnvValidationError("client", parsedClient.error);
}
const clientEnv = Object.freeze(parsedClient.data);

let serverEnv: z.infer<typeof serverSchema>;
if (isServer) {
  const isNextJs = process.env.NEXT_RUNTIME !== undefined || process.env.NEXT_PHASE !== undefined;
  const isVercel = process.env.VERCEL !== undefined;
  const requireNextJsSecrets = isNextJs || isVercel;

  const envToParse = { ...process.env };
  if (!requireNextJsSecrets) {
    const nextJsSecrets = [
      "AUTH_SECRET",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "OPENSUBTITLES_API_KEY",
      "OPENSUBTITLES_USERNAME",
      "OPENSUBTITLES_PASSWORD",
      "RESEND_API_KEY",
      "TMDB_API_KEY",
    ];
    for (const key of nextJsSecrets) {
      if (!envToParse[key]) {
        envToParse[key] = "trigger-placeholder";
      }
    }
  }

  const parsedServer = serverSchema.safeParse(envToParse);
  if (!parsedServer.success) {
    throw createEnvValidationError("server", parsedServer.error);
  }
  serverEnv = Object.freeze(parsedServer.data);
} else {
  // Proxy that throws if accessed on client
  serverEnv = new Proxy(
    {},
    {
      get() {
        throw new Error(
          "❌ Tried to access server-only env var from client. " +
            "Move this logic to a server file or use NEXT_PUBLIC_ vars.",
        );
      },
    },
  ) as z.infer<typeof serverSchema>;
}

export const env = Object.freeze({
  ...clientEnv,
  ...serverEnv,
});

export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;
