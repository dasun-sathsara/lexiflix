import { createRequire } from "node:module";
import { env } from "@/lib/env";
import { Pool, neonConfig } from "@neondatabase/serverless";
import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-serverless";
import type WebSocket from "ws";
import * as schema from "./schema";

// We disable bufferutil for the WebSocket connection to prevent optional native dependency warnings 
// from cluttering the logs during serverless runtime execution.
process.env.WS_NO_BUFFER_UTIL ??= "1";

// Neon requires a custom WebSocket constructor for serverless environments.
// We use createRequire to load 'ws' dynamically to avoid breaking edge/Next.js builds 
// that strictly parse static imports for Node-specific modules.
const require = createRequire(import.meta.url);
const WebSocketConstructor = require("ws") as typeof WebSocket;

neonConfig.webSocketConstructor = WebSocketConstructor;

const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema });

