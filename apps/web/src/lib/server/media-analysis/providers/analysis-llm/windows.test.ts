import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildPromptWindows } from "./windows";

describe("buildPromptWindows", () => {
  it("returns no windows for blank input", () => {
    expect(buildPromptWindows("")).toEqual([]);
    expect(buildPromptWindows("   \n\n  ")).toEqual([]);
  });

  it("keeps short text in a single window", () => {
    expect(buildPromptWindows("line one\nline two")).toEqual(["line one\nline two"]);
  });

  it("splits on line boundaries once the character budget is exceeded", () => {
    const windows = buildPromptWindows("aaaa\nbbbb\ncccc", 10);

    expect(windows).toEqual(["aaaa\nbbbb", "cccc"]);
  });

  it("keeps a line that exactly fills the budget in the same window", () => {
    expect(buildPromptWindows("aaaa\nbbbb", 10)).toEqual(["aaaa\nbbbb"]);
  });

  it("never drops content", () => {
    const text = Array.from({ length: 50 }, (_, index) => `line ${index}`).join("\n");
    const windows = buildPromptWindows(text, 40);

    expect(windows.length).toBeGreaterThan(1);
    expect(windows.join("\n")).toBe(text);
  });

  it("emits a window even when a single line exceeds the budget", () => {
    const longLine = "x".repeat(50);

    expect(buildPromptWindows(longLine, 10)).toEqual([longLine]);
  });
});
