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
} as const;

export function buildTmdbImageUrl(path: string | null | undefined, size: string) {
  return path ? `${IMAGE_BASE_URL}${size}${path}` : null;
}

export type TMDBMediaType = "movie" | "tv";

export interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number;
  popularity?: number;
  release_date?: string;
  first_air_date?: string;
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
  runtime: number | null;
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

export interface TMDBTvSeasonEpisode {
  episode_number: number;
}

export interface TMDBTvSeasonDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  season_number: number;
  episodes?: TMDBTvSeasonEpisode[];
}
