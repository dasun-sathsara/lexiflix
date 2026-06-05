import { z } from "zod";

import { TMDB_IMAGE_BASE_URL as IMAGE_BASE_URL, TMDB_IMAGE_SIZES } from "@/lib/constants";

export { IMAGE_BASE_URL, TMDB_IMAGE_SIZES };

export function buildTmdbImageUrl(path: string | null | undefined, size: string) {
  return path ? `${IMAGE_BASE_URL}${size}${path}` : null;
}

// -----------------------------------------------------------------------------
// Shared Schemas
// -----------------------------------------------------------------------------

export const genreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const genreResponseSchema = z.object({
  genres: z.array(genreSchema),
});

// -----------------------------------------------------------------------------
// Search / Discover
// -----------------------------------------------------------------------------

export const tmdbResultSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  name: z.string().optional(),
  original_title: z.string().optional(),
  original_name: z.string().optional(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  overview: z.string(),
  vote_average: z.number(),
  vote_count: z.number(),
  popularity: z.number().optional(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  genre_ids: z.array(z.number()),
  media_type: z.enum(["movie", "tv", "person"]).optional(),
  original_language: z.string().optional(),
});

export const tmdbResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbResultSchema),
  total_pages: z.number(),
  total_results: z.number(),
});

// -----------------------------------------------------------------------------
// Movie Details
// -----------------------------------------------------------------------------

export const tmdbMovieReleaseDateEntrySchema = z.object({
  certification: z.string(),
});

export const tmdbMovieReleaseDateResultSchema = z.object({
  iso_3166_1: z.string(),
  release_dates: z.array(tmdbMovieReleaseDateEntrySchema),
});

/** Loose: unknown TMDB keys are preserved because full payloads are stored in content.tmdbRaw. */
export const tmdbMovieDetailsSchema = z.looseObject({
  id: z.number(),
  title: z.string(),
  original_title: z.string(),
  overview: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  release_date: z.string(),
  genres: z.array(genreSchema),
  original_language: z.string().nullable(),
  imdb_id: z.string().nullable(),
  runtime: z.number().nullable(),
  popularity: z.number().nullable(),
  vote_average: z.number().nullable(),
  vote_count: z.number().nullable(),
  release_dates: z
    .object({
      results: z.array(tmdbMovieReleaseDateResultSchema),
    })
    .optional(),
});

// -----------------------------------------------------------------------------
// TV Details
// -----------------------------------------------------------------------------

export const tmdbTvContentRatingResultSchema = z.object({
  iso_3166_1: z.string(),
  rating: z.string(),
});

export const tmdbTvExternalIdsSchema = z.object({
  imdb_id: z.string().nullable(),
});

/** Loose: unknown TMDB keys are preserved because full payloads are stored in content.tmdbRaw. */
export const tmdbTvDetailsSchema = z.looseObject({
  id: z.number(),
  name: z.string(),
  original_name: z.string(),
  overview: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  first_air_date: z.string(),
  genres: z.array(genreSchema),
  original_language: z.string().nullable(),
  origin_country: z.array(z.string()),
  popularity: z.number().nullable(),
  vote_average: z.number().nullable(),
  vote_count: z.number().nullable(),
  number_of_seasons: z.number().nullable(),
  external_ids: tmdbTvExternalIdsSchema.optional(),
  content_ratings: z
    .object({
      results: z.array(tmdbTvContentRatingResultSchema),
    })
    .optional(),
});

// -----------------------------------------------------------------------------
// TV Season Details
// -----------------------------------------------------------------------------

export const tmdbTvSeasonEpisodeSchema = z.object({
  episode_number: z.number(),
});

/** Loose: unknown TMDB keys are preserved because full payloads are stored in content.tmdbRaw. */
export const tmdbTvSeasonDetailsSchema = z.looseObject({
  id: z.number(),
  name: z.string(),
  overview: z.string(),
  poster_path: z.string().nullable(),
  air_date: z.string().nullable(),
  season_number: z.number(),
  episodes: z.array(tmdbTvSeasonEpisodeSchema).optional(),
});

// -----------------------------------------------------------------------------
// Derived Types (single source of truth — types flow from schemas)
// -----------------------------------------------------------------------------

export type TMDBMediaType = "movie" | "tv";

export type Genre = z.infer<typeof genreSchema>;
export type GenreResponse = z.infer<typeof genreResponseSchema>;
export type TMDBResult = z.infer<typeof tmdbResultSchema>;
export type TMDBResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};
export type TMDBMovieReleaseDateEntry = z.infer<typeof tmdbMovieReleaseDateEntrySchema>;
export type TMDBMovieReleaseDateResult = z.infer<typeof tmdbMovieReleaseDateResultSchema>;
export type TMDBMovieDetails = z.infer<typeof tmdbMovieDetailsSchema>;
export type TMDBTvContentRatingResult = z.infer<typeof tmdbTvContentRatingResultSchema>;
export type TMDBTvExternalIds = z.infer<typeof tmdbTvExternalIdsSchema>;
export type TMDBTvDetails = z.infer<typeof tmdbTvDetailsSchema>;
export type TMDBTvSeasonEpisode = z.infer<typeof tmdbTvSeasonEpisodeSchema>;
export type TMDBTvSeasonDetails = z.infer<typeof tmdbTvSeasonDetailsSchema>;

// -----------------------------------------------------------------------------
// Decade Date Range (utility kept for reuse across features)
// -----------------------------------------------------------------------------

export interface TmdbDecadeDateRange {
  gteKey: "primary_release_date.gte" | "first_air_date.gte";
  lteKey: "primary_release_date.lte" | "first_air_date.lte";
  gteVal: string;
  lteVal: string;
}

export function buildTmdbDecadeDateRange(
  decade: number,
  mediaType: "movie" | "tv",
): TmdbDecadeDateRange {
  const startYear = decade;
  const endYear = startYear + 9;
  const isTv = mediaType === "tv";
  const gteKey = isTv ? ("first_air_date.gte" as const) : ("primary_release_date.gte" as const);
  const lteKey = isTv ? ("first_air_date.lte" as const) : ("primary_release_date.lte" as const);

  return {
    gteKey,
    lteKey,
    gteVal: `${startYear}-01-01`,
    lteVal: `${endYear}-12-31`,
  };
}
