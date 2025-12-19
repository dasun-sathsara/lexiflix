import dotenv from "dotenv";
import { treeifyError, z } from "zod";

dotenv.config();

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z
    .string()
    .describe("Public base URL, e.g., https://lexiflix.app")
    .optional(),
  NEXT_PUBLIC_ENV: z
    .enum(["development", "test", "production"])
    .default(process.env.NODE_ENV as "development" | "test" | "production"),
});

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
  R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME is required"),
  R2_ENDPOINT: z.string().min(1, "R2_ENDPOINT is required"),
  R2_PUBLIC_BASE_URL: z.url("R2_PUBLIC_BASE_URL must be a valid URL, e.g. https://cdn.example.com"),
  TMDB_API_KEY: z.string().min(1, "TMDB_API_KEY is required"),
});

const isServer = typeof window === "undefined";

const clientRaw = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV as "development" | "test" | "production" | undefined,
};

const parsedClient = clientSchema.safeParse(clientRaw);
if (!parsedClient.success) {
  console.error("❌ Invalid client env:", treeifyError(parsedClient.error).properties);
  throw new Error("Invalid client environment variables");
}
const clientEnv = Object.freeze(parsedClient.data);

let serverEnv: z.infer<typeof serverSchema>;
if (isServer) {
  const parsedServer = serverSchema.safeParse(process.env);
  if (!parsedServer.success) {
    console.error("❌ Invalid server env:", treeifyError(parsedServer.error).properties);
    throw new Error("Invalid server environment variables");
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
