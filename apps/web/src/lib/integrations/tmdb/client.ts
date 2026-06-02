import "server-only";

import { env } from "@/lib/config/env";
import type {
  GenreResponse,
  TMDBMovieDetails,
  TMDBResponse,
  TMDBResult,
  TMDBTvDetails,
  TMDBTvSeasonDetails,
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

async function fetchTMDB<T>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: FetchOptions = {},
): Promise<T> {
  const searchParams = new URLSearchParams({
    api_key: env.TMDB_API_KEY,
  });

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  }

  const res = await fetch(`${BASE_URL}${endpoint}?${searchParams.toString()}`, {
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
          const releaseDates = details.release_dates?.results || [];
          const usRelease = releaseDates.find((r) => r.iso_3166_1 === "US");
          const certifications = usRelease?.release_dates?.map((r) => r.certification) || [];
          const isROrAdult = certifications.some(
            (c) => c === "R" || c === "NC-17" || c === "NR" || c === "UR",
          );
          if (isROrAdult) {
            return null; // Exclude
          }
        } else {
          const details = await getTvDetails(item.id);
          const ratings = details.content_ratings?.results || [];
          const usRating = ratings.find((r) => r.iso_3166_1 === "US");
          const rating = usRating?.rating;
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

export async function getTvSeasonDetails(tvId: number, seasonNumber: number) {
  return fetchTMDB<TMDBTvSeasonDetails>(
    `/tv/${tvId}/season/${seasonNumber}`,
    { language: "en-US" },
    {
      tags: [`tv-season-details-${tvId}-${seasonNumber}`],
    },
  );
}
