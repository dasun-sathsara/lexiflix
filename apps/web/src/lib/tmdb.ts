import { env } from "@/lib/env";

const BASE_URL = "https://api.themoviedb.org/3";
export const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
export type TMDBMediaType = "movie" | "tv";

export const TMDB_IMAGE_SIZES = {
  poster: {
    sm: "/w342",
    md: "/w500",
    lg: "/w780",
    original: "/original",
  },
  backdrop: {
    sm: "/w300",
    md: "/w780",
    lg: "/w1280",
    original: "/original",
  },
};

type FetchOptions = {
  tags?: string[];
  revalidate?: number;
};

async function fetchTMDB<T>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: FetchOptions = {},
): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.append("api_key", env.TMDB_API_KEY);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, String(value));
    }
  });

  const res = await fetch(url.toString(), {
    next: {
      tags: options.tags,
      revalidate: options.revalidate ?? 3600, // Default 1 hour cache
    },
  });

  if (!res.ok) {
    throw new Error(`TMDB Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Types
export interface TMDBResult {
  id: number;
  title?: string; // Movie
  name?: string; // TV
  original_title?: string;
  original_name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number;
  popularity?: number;
  release_date?: string; // Movie
  first_air_date?: string; // TV
  genre_ids: number[];
  media_type?: "movie" | "tv" | "person";
  original_language?: string;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface GenreResponse {
  genres: Genre[];
}

export interface TMDBMovieReleaseDateEntry {
  certification: string;
}

export interface TMDBMovieReleaseDateResult {
  iso_3166_1: string;
  release_dates: TMDBMovieReleaseDateEntry[];
}

export interface TMDBMovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genres: Genre[];
  original_language: string | null;
  imdb_id: string | null;
  popularity: number | null;
  vote_average: number | null;
  vote_count: number | null;
  release_dates?: {
    results: TMDBMovieReleaseDateResult[];
  };
}

export interface TMDBTvContentRatingResult {
  iso_3166_1: string;
  rating: string;
}

export interface TMDBTvExternalIds {
  imdb_id: string | null;
}

export interface TMDBTvDetails {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  genres: Genre[];
  original_language: string | null;
  origin_country: string[];
  popularity: number | null;
  vote_average: number | null;
  vote_count: number | null;
  number_of_seasons: number | null;
  external_ids?: TMDBTvExternalIds;
  content_ratings?: {
    results: TMDBTvContentRatingResult[];
  };
}

// API Functions

export async function getGenres(type: "movie" | "tv") {
  return fetchTMDB<GenreResponse>(
    `/genre/${type}/list`,
    { language: "en-US" },
    { tags: [`genres-${type}`], revalidate: 86400 },
  ); // Cache for 24 hours
}

export async function discoverMedia(
  type: "movie" | "tv",
  params: Record<string, string | number | boolean | undefined>,
) {
  // Hard filters: English language only, min 1000 votes
  const finalParams = {
    ...params,
    language: "en-US",
    include_adult: false,
    with_original_language: "en",
    "vote_count.gte": 1000,
  };

  return fetchTMDB<TMDBResponse<TMDBResult>>(`/discover/${type}`, finalParams, {
    tags: [`discover-${type}`],
  });
}

export async function searchMedia(query: string, type: "movie" | "tv", page: number = 1) {
  const data = await fetchTMDB<TMDBResponse<TMDBResult>>(
    `/search/${type}`,
    { query, page, language: "en-US", include_adult: false },
    { tags: [`search-${type}-${query}`] },
  );

  // Post-filter search results as API doesn't support these filters on search endpoints
  // Note: This effectively reduces the page size below 20
  // data.results = data.results.filter(
  //   (item) => item.original_language === "en" && item.vote_count >= 1000,
  // );

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
  );
}

export async function getMediaDetails(mediaType: TMDBMediaType, tmdbId: number) {
  if (mediaType === "movie") {
    return getMovieDetails(tmdbId);
  }

  return getTvDetails(tmdbId);
}
