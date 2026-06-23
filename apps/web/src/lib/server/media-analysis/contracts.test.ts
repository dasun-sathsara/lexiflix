import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { cefrNumericFromLevel } from "./contracts";

describe("cefrNumericFromLevel", () => {
  it("maps valid CEFR levels to numeric values", () => {
    expect(cefrNumericFromLevel("A1")).toBe(1);
    expect(cefrNumericFromLevel("A2")).toBe(2);
    expect(cefrNumericFromLevel("B1")).toBe(3);
    expect(cefrNumericFromLevel("B2")).toBe(4);
    expect(cefrNumericFromLevel("C1")).toBe(5);
    expect(cefrNumericFromLevel("C2")).toBe(6);
  });

  it("returns null for null input", () => {
    expect(cefrNumericFromLevel(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(cefrNumericFromLevel(undefined)).toBeNull();
  });

  it("returns null for invalid string", () => {
    expect(cefrNumericFromLevel("Z9")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(cefrNumericFromLevel("")).toBeNull();
  });
});
