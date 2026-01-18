import { env } from "@/lib/env";

const BASE_URL = "https://api.themoviedb.org/3";
export const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

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
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number;
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

// API Functions

export async function getGenres(type: "movie" | "tv") {
  return fetchTMDB<GenreResponse>(
    `/genre/${type}/list`,
    {},
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
    { query, page },
    { tags: [`search-${type}-${query}`] },
  );

  // Post-filter search results as API doesn't support these filters on search endpoints
  // Note: This effectively reduces the page size below 20
  // data.results = data.results.filter(
  //   (item) => item.original_language === "en" && item.vote_count >= 1000,
  // );

  return data;
}
