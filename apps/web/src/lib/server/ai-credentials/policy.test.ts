import { describe, expect, it } from "vitest";

import { chooseCredentialSource } from "./policy";

describe("chooseCredentialSource", () => {
  it("uses the user credential when one is usable", () => {
    expect(
      chooseCredentialSource({ enforceSystemCredentials: false, hasUsableUserCredential: true }),
    ).toBe("user");
  });

  it("falls back to system credentials when the user has none", () => {
    expect(
      chooseCredentialSource({ enforceSystemCredentials: false, hasUsableUserCredential: false }),
    ).toBe("system");
  });

  it("lets admin enforcement override a usable user credential", () => {
    expect(
      chooseCredentialSource({ enforceSystemCredentials: true, hasUsableUserCredential: true }),
    ).toBe("system");
  });

  it("stays on system credentials when enforcement is on and nothing is configured", () => {
    expect(
      chooseCredentialSource({ enforceSystemCredentials: true, hasUsableUserCredential: false }),
    ).toBe("system");
  });
});
