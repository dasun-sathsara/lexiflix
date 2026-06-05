import "server-only";

import { env } from "@/lib/config/env";
import { TMDB_REQUEST_TIMEOUT_MS } from "@/lib/constants";
import {
  extractMovieCertification,
  extractTvCertification,
} from "@/lib/integrations/tmdb/certification";
import {
  type GenreResponse,
  genreResponseSchema,
  type TMDBMovieDetails,
  type TMDBResponse,
  type TMDBResult,
  type TMDBTvDetails,
  type TMDBTvSeasonDetails,
  tmdbMovieDetailsSchema,
  tmdbResponseSchema,
  tmdbTvDetailsSchema,
  tmdbTvSeasonDetailsSchema,
} from "@/lib/integrations/tmdb/contracts";

const BASE_URL = "https://api.themoviedb.org/3";

export type {
  TMDBMediaType,
  TMDBMovieDetails,
  TMDBResult,
  TMDBTvDetails,
  TMDBTvSeasonDetails,
} from "@/lib/integrations/tmdb/contracts";

type FetchOptions = {
  tags?: string[];
  revalidate?: number;
};

/**
 * Reads JSON from a fetch response tolerantly, returning the parsed value or
 * null on empty/malformed bodies. Mirrors the convention of readJsonSafely from
 * lib/server/utils/request.ts but kept inline to avoid a server-only import
 * (this module uses Next.js caching which is separate from the retry pipeline).
 */
async function readJsonSafelyLocal(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function fetchTMDB<T>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: FetchOptions = {},
  parse: (raw: unknown) => T,
): Promise<T> {
  const searchParams = new URLSearchParams({
    api_key: env.TMDB_API_KEY,
  });

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  }

  let res: Response;

  try {
    res = await fetch(`${BASE_URL}${endpoint}?${searchParams.toString()}`, {
      signal: AbortSignal.timeout(TMDB_REQUEST_TIMEOUT_MS),
      next: {
        tags: options.tags,
        revalidate: options.revalidate ?? 3600, // Default 1 hour cache
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("TMDB request timed out.");
    }

    throw new Error(
      error instanceof Error ? error.message : "TMDB request could not be completed.",
    );
  }

  if (!res.ok) {
    throw new Error(`TMDB Error: ${res.status} ${res.statusText}`);
  }

  const raw = await readJsonSafelyLocal(res);
  return parse(raw);
}

function parseGenreResponse(raw: unknown): GenreResponse {
  const parsed = genreResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("TMDB returned an invalid genre response contract.");
  }
  return parsed.data;
}

function parseTmdbResponse(raw: unknown): TMDBResponse<TMDBResult> {
  const parsed = tmdbResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("TMDB returned an invalid search/discover response contract.");
  }
  return parsed.data;
}

function parseMovieDetails(raw: unknown): TMDBMovieDetails {
  const parsed = tmdbMovieDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("TMDB returned an invalid movie details response contract.");
  }
  return parsed.data;
}

function parseTvDetails(raw: unknown): TMDBTvDetails {
  const parsed = tmdbTvDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("TMDB returned an invalid TV details response contract.");
  }
  return parsed.data;
}

function parseTvSeasonDetails(raw: unknown): TMDBTvSeasonDetails {
  const parsed = tmdbTvSeasonDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("TMDB returned an invalid TV season details response contract.");
  }
  return parsed.data;
}

// API Functions

export async function getGenres(type: "movie" | "tv") {
  return fetchTMDB<GenreResponse>(
    `/genre/${type}/list`,
    { language: "en-US" },
    { tags: [`genres-${type}`], revalidate: 86400 },
    parseGenreResponse,
  ); // Cache for 24 hours
}

export async function discoverMedia(
  type: "movie" | "tv",
  params: Record<string, string | number | boolean | undefined>,
) {
  // Hard filters: English language only, min 1000 votes, and age rating filter (PG-13 or TV-14)
  const finalParams = {
    ...params,
    language: "en-US",
    include_adult: false,
    with_original_language: "en",
    "vote_count.gte": 1000,
    certification_country: "US",
    "certification.lte": type === "movie" ? "PG-13" : "TV-14",
  };

  return fetchTMDB<TMDBResponse<TMDBResult>>(
    `/discover/${type}`,
    finalParams,
    {
      tags: [`discover-${type}`],
    },
    parseTmdbResponse,
  );
}

export async function searchMedia(query: string, type: "movie" | "tv", page: number = 1) {
  const data = await fetchTMDB<TMDBResponse<TMDBResult>>(
    `/search/${type}`,
    { query, page, language: "en-US", include_adult: false },
    { tags: [`search-${type}-${query}`] },
    parseTmdbResponse,
  );

  // Filter out non-mainstream ones first (based on what we already have in the search results)
  const filteredResults = data.results.filter(
    (item) => item.original_language === "en" && (item.vote_count ?? 0) >= 100,
  );

  // Fetch details for the remaining mainstream results to filter out R-rated / TV-MA / NR
  const detailedResults = await Promise.all(
    filteredResults.map(async (item) => {
      try {
        if (type === "movie") {
          const details = await getMovieDetails(item.id);
          const certification = extractMovieCertification(details);
          if (
            certification === "R" ||
            certification === "NC-17" ||
            certification === "NR" ||
            certification === "UR"
          ) {
            return null; // Exclude
          }
        } else {
          const details = await getTvDetails(item.id);
          const rating = extractTvCertification(details);
          if (rating === "TV-MA" || rating === "R" || rating === "NC-17") {
            return null; // Exclude
          }
        }
        return item;
      } catch (_err) {
        return null; // Safe default: exclude if detail fetch fails
      }
    }),
  );

  data.results = detailedResults.filter((item): item is TMDBResult => item !== null);
  return data;
}

export async function getMovieDetails(movieId: number) {
  return fetchTMDB<TMDBMovieDetails>(
    `/movie/${movieId}`,
    {
      append_to_response: "external_ids,release_dates",
      language: "en-US",
    },
    {
      tags: [`movie-details-${movieId}`],
    },
    parseMovieDetails,
  );
}

export async function getTvDetails(tvId: number) {
  return fetchTMDB<TMDBTvDetails>(
    `/tv/${tvId}`,
    {
      append_to_response: "external_ids,content_ratings",
      language: "en-US",
    },
    {
      tags: [`tv-details-${tvId}`],
    },
    parseTvDetails,
  );
}

export async function getTvSeasonDetails(tvId: number, seasonNumber: number) {
  return fetchTMDB<TMDBTvSeasonDetails>(
    `/tv/${tvId}/season/${seasonNumber}`,
    { language: "en-US" },
    {
      tags: [`tv-season-details-${tvId}-${seasonNumber}`],
    },
    parseTvSeasonDetails,
  );
}
