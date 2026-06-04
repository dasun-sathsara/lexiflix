import { describe, expect, it } from "vitest";

import { contextListSchema, normalizeContextList, normalizeContextText } from "./contexts";

describe("normalizeContextText", () => {
  it("accepts plain strings and legacy object rows", () => {
    expect(normalizeContextText("  hello  ")).toBe("hello");
    expect(normalizeContextText({ text: " legacy " })).toBe("legacy");
  });

  it("returns null for empty or unsupported entries", () => {
    expect(normalizeContextText("   ")).toBeNull();
    expect(normalizeContextText({ text: "" })).toBeNull();
    expect(normalizeContextText(42)).toBeNull();
    expect(normalizeContextText(null)).toBeNull();
  });
});

describe("normalizeContextList", () => {
  it("trims, drops blanks and de-duplicates", () => {
    expect(normalizeContextList([" a ", "a", "", { text: "b" }, null])).toEqual(["a", "b"]);
  });

  it("caps the list when a limit is given", () => {
    expect(normalizeContextList(["a", "b", "c"], 2)).toEqual(["a", "b"]);
  });

  it("returns an empty list for non-array input", () => {
    expect(normalizeContextList(undefined)).toEqual([]);
  });
});

describe("contextListSchema", () => {
  it("normalizes mixed provider payloads", () => {
    expect(contextListSchema.parse(["a", { text: " a " }, "b"])).toEqual(["a", "b"]);
  });

  it("defaults to an empty list", () => {
    expect(contextListSchema.parse(undefined)).toEqual([]);
  });
});
