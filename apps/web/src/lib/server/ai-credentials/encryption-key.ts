import "server-only";

import { env } from "@/lib/config/env";
import { deriveEncryptionKey } from "@/lib/server/security/secret-box";

/**
 * Sentinel injected by `lib/config/env.ts` when Next.js-only secrets are absent (for example in
 * tooling contexts). Encrypting with it would silently produce undecryptable rows.
 */
const PLACEHOLDER_SECRET = "trigger-placeholder";
const KEY_PURPOSE = "ai-credentials";

let cachedKey: Buffer | null = null;

/**
 * Resolves the key used to encrypt user AI credentials.
 *
 * `AI_CREDENTIALS_ENCRYPTION_KEY` is preferred; otherwise the key is derived from
 * `AUTH_SECRET`. Both are synced to the Trigger.dev worker (see `trigger.config.ts`) because
 * pack generation decrypts credentials there. Rotating the source secret makes existing rows
 * undecryptable — users then have to re-enter their keys.
 */
export function getAiCredentialEncryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const material = env.AI_CREDENTIALS_ENCRYPTION_KEY ?? env.AUTH_SECRET;

  if (!material || material === PLACEHOLDER_SECRET) {
    throw new Error(
      "AI credential encryption is unavailable: set AI_CREDENTIALS_ENCRYPTION_KEY or make AUTH_SECRET available to this runtime.",
    );
  }

  cachedKey = deriveEncryptionKey(material, KEY_PURPOSE);
  return cachedKey;
}

/** True when the runtime can encrypt/decrypt credentials, used to degrade the UI gracefully. */
export function isAiCredentialEncryptionAvailable(): boolean {
  try {
    getAiCredentialEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
