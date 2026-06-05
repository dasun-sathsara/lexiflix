import { getGenres } from "@/lib/integrations/tmdb/client";
import type { Genre } from "@/lib/integrations/tmdb/contracts";

export interface UnifiedGenreMap {
  movieGenres: Genre[];
  tvGenres: Genre[];
  genreMap: Record<number, string>;
}

/**
 * Fetches both movie and TV genre lists in parallel and merges them into a
 * single id→name lookup map.
 */
export async function getUnifiedGenreMap(): Promise<UnifiedGenreMap> {
  const [movieResponse, tvResponse] = await Promise.all([getGenres("movie"), getGenres("tv")]);

  const genreMap: Record<number, string> = {};
  for (const g of [...movieResponse.genres, ...tvResponse.genres]) {
    genreMap[g.id] = g.name;
  }

  return {
    movieGenres: movieResponse.genres,
    tvGenres: tvResponse.genres,
    genreMap,
  };
}
