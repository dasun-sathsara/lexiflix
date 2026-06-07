import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decryptSecret, deriveEncryptionKey, encryptSecret, maskSecret } from "./secret-box";

const key = deriveEncryptionKey("unit-test-secret-material", "test-purpose");

describe("secret-box", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips a secret", () => {
    const envelope = encryptSecret("super-secret-api-key", key);

    expect(envelope.startsWith("v1.")).toBe(true);
    expect(envelope).not.toContain("super-secret-api-key");
    expect(decryptSecret(envelope, key)).toBe("super-secret-api-key");
  });

  it("produces a different envelope on every call", () => {
    expect(encryptSecret("same-value", key)).not.toBe(encryptSecret("same-value", key));
  });

  it("rejects a tampered envelope", () => {
    const envelope = encryptSecret("super-secret-api-key", key);
    const [version, iv, tag, ciphertext] = envelope.split(".");
    const flipped = Buffer.from(ciphertext, "base64");
    flipped[0] ^= 0xff;
    const tampered = [version, iv, tag, flipped.toString("base64")].join(".");

    expect(() => decryptSecret(tampered, key)).toThrow();
  });

  it("rejects a foreign key", () => {
    const envelope = encryptSecret("super-secret-api-key", key);
    const otherKey = deriveEncryptionKey("different-material", "test-purpose");

    expect(() => decryptSecret(envelope, otherKey)).toThrow();
  });

  it("rejects unsupported envelope versions", () => {
    expect(() => decryptSecret("v2.aaa.bbb.ccc", key)).toThrow(
      /Unsupported or malformed secret envelope/,
    );
  });

  it("derives distinct keys per purpose", () => {
    expect(deriveEncryptionKey("material", "a").equals(deriveEncryptionKey("material", "b"))).toBe(
      false,
    );
  });

  it("refuses empty inputs", () => {
    expect(() => deriveEncryptionKey("", "purpose")).toThrow();
    expect(() => encryptSecret("", key)).toThrow();
  });

  it("masks all but the last four characters", () => {
    expect(maskSecret("abcdefgh")).toBe("••••efgh");
    expect(maskSecret("abc")).toBe("••••");
  });
});
