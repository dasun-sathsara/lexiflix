import { describe, expect, it } from "vitest";
import {
  buildCuratedAdminDiscoverParams,
  parseCuratedAdminCatalogFilter,
  parseCuratedAdminSearchParams,
} from "./utils";

describe("parseCuratedAdminSearchParams — parsePage behavior", () => {
  it("defaults to page 1 when no page param provided", () => {
    const result = parseCuratedAdminSearchParams({});
    expect(result.page).toBe(1);
  });

  it("falls back to 1 for invalid page strings", () => {
    expect(parseCuratedAdminSearchParams({ page: "abc" }).page).toBe(1);
    expect(parseCuratedAdminSearchParams({ page: "-5" }).page).toBe(1);
    expect(parseCuratedAdminSearchParams({ page: "0" }).page).toBe(1);
  });

  it("caps page at 500", () => {
    expect(parseCuratedAdminSearchParams({ page: "999" }).page).toBe(500);
    expect(parseCuratedAdminSearchParams({ page: "500" }).page).toBe(500);
  });
});

describe("parseCuratedAdminSearchParams — parseDecade behavior", () => {
  it("returns null for invalid decade", () => {
    expect(parseCuratedAdminSearchParams({ decade: "abc" }).decade).toBeNull();
  });

  it("returns null for out-of-range decade", () => {
    expect(parseCuratedAdminSearchParams({ decade: "1890" }).decade).toBeNull();
    expect(parseCuratedAdminSearchParams({ decade: "2040" }).decade).toBeNull();
  });

  it("returns null for non-multiple-of-10", () => {
    expect(parseCuratedAdminSearchParams({ decade: "1995" }).decade).toBeNull();
  });

  it("parses valid decade correctly", () => {
    expect(parseCuratedAdminSearchParams({ decade: "1990" }).decade).toBe(1990);
    expect(parseCuratedAdminSearchParams({ decade: "2010" }).decade).toBe(2010);
  });
});

describe("parseCuratedAdminSearchParams", () => {
  it("returns default values when params empty", () => {
    const result = parseCuratedAdminSearchParams({});
    expect(result.view).toBe("discover");
    expect(result.mode).toBe("search");
    expect(result.mediaType).toBe("movie");
    expect(result.query).toBe("");
    expect(result.page).toBe(1);
    expect(result.genreId).toBeNull();
    expect(result.sortBy).toBe("popularity.desc");
    expect(result.decade).toBeNull();
  });

  it("parses all fields correctly", () => {
    const result = parseCuratedAdminSearchParams({
      view: "catalog",
      mode: "browse",
      type: "tv",
      q: "  inception  ",
      page: "3",
      genre: "28",
      sort: "vote_average.desc",
      decade: "2010",
    });
    expect(result.view).toBe("catalog");
    expect(result.mode).toBe("browse");
    expect(result.mediaType).toBe("tv");
    expect(result.query).toBe("inception");
    expect(result.page).toBe(3);
    expect(result.genreId).toBe("28");
    expect(result.sortBy).toBe("vote_average.desc");
    expect(result.decade).toBe(2010);
  });

  it("falls back to defaults for invalid view, mode, and type", () => {
    const result = parseCuratedAdminSearchParams({
      view: "invalid",
      mode: "invalid",
      type: "invalid",
    });
    expect(result.view).toBe("discover");
    expect(result.mode).toBe("search");
    expect(result.mediaType).toBe("movie");
  });

  it("falls back to default sort for media type when invalid", () => {
    const movieResult = parseCuratedAdminSearchParams({
      type: "movie",
      sort: "first_air_date.desc",
    });
    expect(movieResult.sortBy).toBe("popularity.desc");

    const tvResult = parseCuratedAdminSearchParams({
      type: "tv",
      sort: "revenue.desc",
    });
    expect(tvResult.sortBy).toBe("popularity.desc");
  });

  it("trims query parameter", () => {
    expect(parseCuratedAdminSearchParams({ q: "  hello  " }).query).toBe("hello");
    expect(parseCuratedAdminSearchParams({ q: "\tworld\n" }).query).toBe("world");
  });
});

describe("buildCuratedAdminDiscoverParams", () => {
  it("returns basic params for basic state", () => {
    const state = {
      view: "discover" as const,
      mode: "search" as const,
      mediaType: "movie" as const,
      query: "",
      page: 2,
      genreId: "28",
      sortBy: "popularity.desc",
      decade: null,
    };
    const params = buildCuratedAdminDiscoverParams(state);
    expect(params).toEqual({
      page: 2,
      sort_by: "popularity.desc",
      with_genres: "28",
    });
  });

  it("adds movie date range for decade filter on movies", () => {
    const state = {
      view: "discover" as const,
      mode: "search" as const,
      mediaType: "movie" as const,
      query: "",
      page: 1,
      genreId: null,
      sortBy: "popularity.desc",
      decade: 1990,
    };
    const params = buildCuratedAdminDiscoverParams(state);
    expect(params).toMatchObject({
      "primary_release_date.gte": "1990-01-01",
      "primary_release_date.lte": "1999-12-31",
    });
  });

  it("adds TV date range for decade filter on TV", () => {
    const state = {
      view: "discover" as const,
      mode: "search" as const,
      mediaType: "tv" as const,
      query: "",
      page: 1,
      genreId: null,
      sortBy: "popularity.desc",
      decade: 2010,
    };
    const params = buildCuratedAdminDiscoverParams(state);
    expect(params).toMatchObject({
      "first_air_date.gte": "2010-01-01",
      "first_air_date.lte": "2019-12-31",
    });
  });
});

describe("parseCuratedAdminCatalogFilter", () => {
  it("returns default values when params empty", () => {
    const result = parseCuratedAdminCatalogFilter({});
    expect(result.mediaType).toBe("all");
    expect(result.status).toBe("all");
  });

  it("parses valid movie and tv type", () => {
    expect(parseCuratedAdminCatalogFilter({ cat_type: "movie" }).mediaType).toBe("movie");
    expect(parseCuratedAdminCatalogFilter({ cat_type: "tv" }).mediaType).toBe("tv");
  });

  it("parses valid published and hidden status", () => {
    expect(parseCuratedAdminCatalogFilter({ cat_status: "published" }).status).toBe("published");
    expect(parseCuratedAdminCatalogFilter({ cat_status: "hidden" }).status).toBe("hidden");
  });

  it("falls back to all for invalid values", () => {
    const result = parseCuratedAdminCatalogFilter({
      cat_type: "invalid",
      cat_status: "invalid",
    });
    expect(result.mediaType).toBe("all");
    expect(result.status).toBe("all");
  });
});
