import type { TMDBMediaType } from "@/lib/tmdb-shared";

export type CuratedAdminMode = "search" | "browse";
export type CuratedAdminView = "discover" | "catalog";

export type CuratedAdminQueryState = {
  view: CuratedAdminView;
  mode: CuratedAdminMode;
  mediaType: TMDBMediaType;
  query: string;
  page: number;
  genreId: string | null;
  sortBy: string;
  decade: number | null;
};

const MOVIE_SORT_OPTIONS = [
  "popularity.desc",
  "vote_average.desc",
  "primary_release_date.desc",
] as const;

const TV_SORT_OPTIONS = ["popularity.desc", "vote_average.desc", "first_air_date.desc"] as const;

function parsePage(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(parsed, 500);
}

function parseDecade(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1900 || parsed > 2030 || parsed % 10 !== 0) {
    return null;
  }

  return parsed;
}

export function getDefaultAdminSort(mediaType: TMDBMediaType) {
  return mediaType === "movie" ? MOVIE_SORT_OPTIONS[0] : TV_SORT_OPTIONS[0];
}

export function getAdminSortOptions(mediaType: TMDBMediaType) {
  return mediaType === "movie" ? [...MOVIE_SORT_OPTIONS] : [...TV_SORT_OPTIONS];
}

export function parseCuratedAdminSearchParams(
  params: Record<string, string | string[] | undefined>,
) {
  const view: CuratedAdminView =
    typeof params.view === "string" && (params.view === "discover" || params.view === "catalog")
      ? params.view
      : "discover";

  const mode: CuratedAdminMode =
    typeof params.mode === "string" && (params.mode === "search" || params.mode === "browse")
      ? params.mode
      : "search";

  const mediaType: TMDBMediaType =
    typeof params.type === "string" && (params.type === "movie" || params.type === "tv")
      ? params.type
      : "movie";

  const defaultSort = getDefaultAdminSort(mediaType);
  const allowedSorts = new Set<string>(getAdminSortOptions(mediaType));
  const requestedSort = typeof params.sort === "string" ? params.sort : defaultSort;

  return {
    view,
    mode,
    mediaType,
    query: typeof params.q === "string" ? params.q.trim() : "",
    page: parsePage(params.page),
    genreId: typeof params.genre === "string" && params.genre !== "all" ? params.genre : null,
    sortBy: allowedSorts.has(requestedSort) ? requestedSort : defaultSort,
    decade: parseDecade(params.decade),
  } satisfies CuratedAdminQueryState;
}

export function buildCuratedAdminDiscoverParams(state: CuratedAdminQueryState) {
  const params: Record<string, string | number | undefined> = {
    page: state.page,
    sort_by: state.sortBy,
    with_genres: state.genreId ?? undefined,
  };

  if (state.decade) {
    const startYear = state.decade;
    const endYear = state.decade + 9;

    if (state.mediaType === "movie") {
      params["primary_release_date.gte"] = `${startYear}-01-01`;
      params["primary_release_date.lte"] = `${endYear}-12-31`;
    } else {
      params["first_air_date.gte"] = `${startYear}-01-01`;
      params["first_air_date.lte"] = `${endYear}-12-31`;
    }
  }

  return params;
}

// ---------------------------------------------------------------------------
// Catalog filter types (appended — do not remove above code)
// ---------------------------------------------------------------------------

import type { TMDBResult } from "@/lib/tmdb-shared";

export type AnnotatedTMDBResult = TMDBResult & { isCurated: boolean };

export type CuratedAdminCatalogFilter = {
  mediaType: "all" | "movie" | "tv";
  status: "all" | "published" | "hidden";
};

export function parseCuratedAdminCatalogFilter(
  params: Record<string, string | string[] | undefined>,
): CuratedAdminCatalogFilter {
  const mediaType =
    typeof params.cat_type === "string" && (params.cat_type === "movie" || params.cat_type === "tv")
      ? (params.cat_type as "movie" | "tv")
      : ("all" as const);

  const status =
    typeof params.cat_status === "string" &&
    (params.cat_status === "published" || params.cat_status === "hidden")
      ? (params.cat_status as "published" | "hidden")
      : ("all" as const);

  return { mediaType, status };
}
