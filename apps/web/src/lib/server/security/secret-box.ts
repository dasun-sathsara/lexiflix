import "server-only";

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Minimal authenticated-encryption helper for at-rest secrets (AES-256-GCM).
 *
 * The key is passed in rather than read from env so the primitives stay pure and testable;
 * see `lib/server/ai-credentials/encryption-key.ts` for key resolution.
 *
 * Envelope format: `v1.<base64 iv>.<base64 authTag>.<base64 ciphertext>`.
 */

const ENVELOPE_VERSION = "v1";
const KEY_BYTES = 32;
const IV_BYTES = 12;

/** Derives a 32-byte encryption key from arbitrary secret material. */
export function deriveEncryptionKey(secretMaterial: string, purpose: string): Buffer {
  if (!secretMaterial) {
    throw new Error("Cannot derive an encryption key from empty secret material.");
  }

  return Buffer.from(
    hkdfSync("sha256", secretMaterial, "lexiflix:secret-box:v1", purpose, KEY_BYTES),
  );
}

export function encryptSecret(plaintext: string, key: Buffer): string {
  if (!plaintext) {
    throw new Error("Cannot encrypt an empty secret.");
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENVELOPE_VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptSecret(envelope: string, key: Buffer): string {
  const [version, ivPart, tagPart, ciphertextPart] = envelope.split(".");

  if (version !== ENVELOPE_VERSION || !ivPart || !tagPart || !ciphertextPart) {
    throw new Error("Unsupported or malformed secret envelope.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Last four characters of a secret, used as a non-sensitive display hint. */
export function maskSecret(plaintext: string): string {
  const trimmed = plaintext.trim();
  return trimmed.length <= 4 ? "••••" : `••••${trimmed.slice(-4)}`;
}
