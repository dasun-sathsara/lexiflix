import type { Config } from "drizzle-kit";
import "dotenv/config";
import { env } from "@/lib/env";

export default {
  schema: "./src/lib/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
} satisfies Config;
