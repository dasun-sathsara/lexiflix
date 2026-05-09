import { describe, expect, it } from "vitest";
import { buildContentMediaHref, getLanguageName } from "./utils";

describe("buildContentMediaHref", () => {
  it("returns correct movie URL for a movie with tmdbMovieId", () => {
    const row = {
      kind: "movie" as const,
      tmdbMovieId: 123,
      tmdbShowId: null,
      tmdbSeasonNumber: null,
    };
    expect(buildContentMediaHref(row)).toBe("/media/123?type=movie");
  });

  it("returns correct season URL for a season with tmdbShowId and seasonNumber", () => {
    const row = {
      kind: "season" as const,
      tmdbMovieId: null,
      tmdbShowId: 456,
      tmdbSeasonNumber: 2,
    };
    expect(buildContentMediaHref(row)).toBe("/media/456?type=tv&season=2");
  });

  it("uses fallback season number when tmdbSeasonNumber is null", () => {
    const row = {
      kind: "season" as const,
      tmdbMovieId: null,
      tmdbShowId: 789,
      tmdbSeasonNumber: null,
    };
    expect(buildContentMediaHref(row, { fallbackSeasonNumber: 1 })).toBe(
      "/media/789?type=tv&season=1",
    );
  });

  it("returns null when ids are missing", () => {
    const row = {
      kind: "movie" as const,
      tmdbMovieId: null,
      tmdbShowId: null,
      tmdbSeasonNumber: null,
    };
    expect(buildContentMediaHref(row)).toBeNull();

    const seasonRow = {
      kind: "season" as const,
      tmdbMovieId: null,
      tmdbShowId: null,
      tmdbSeasonNumber: null,
    };
    expect(buildContentMediaHref(seasonRow)).toBeNull();
  });
});

describe("getLanguageName", () => {
  it("returns English for code en", () => {
    expect(getLanguageName("en")).toBe("English");
  });

  it("returns Intl result for unknown code", () => {
    expect(getLanguageName("xx")).toBe("xx");
  });

  it("returns uppercased input when Intl throws", () => {
    expect(getLanguageName("")).toBe("");
  });
});
