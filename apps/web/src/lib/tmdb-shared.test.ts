import { describe, expect, it } from "vitest";
import { buildTmdbImageUrl } from "./tmdb-shared";

describe("buildTmdbImageUrl", () => {
  it("returns a correct URL for a valid path and size", () => {
    const url = buildTmdbImageUrl("/poster.jpg", "/w500");
    expect(url).toBe("https://image.tmdb.org/t/p/w500/poster.jpg");
  });

  it("returns null for null path", () => {
    expect(buildTmdbImageUrl(null, "/w500")).toBeNull();
  });

  it("returns null for undefined path", () => {
    expect(buildTmdbImageUrl(undefined, "/w500")).toBeNull();
  });

  it("returns null for empty string path", () => {
    expect(buildTmdbImageUrl("", "/w500")).toBeNull();
  });
});
