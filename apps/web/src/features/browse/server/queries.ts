import "server-only";

import { discoverMedia, searchMedia } from "@/lib/integrations/tmdb/client";
import type { Genre, TMDBResult } from "@/lib/integrations/tmdb/contracts";
import { buildTmdbDecadeDateRange } from "@/lib/integrations/tmdb/contracts";
import { getUnifiedGenreMap } from "@/lib/integrations/tmdb/genres";

interface GetBrowseViewParams {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function getBrowseView({ searchParams }: GetBrowseViewParams): Promise<{
  results: TMDBResult[];
  genreMap: Record<number, string>;
  currentGenres: Genre[];
  currentPage: number;
  totalPages: number;
}> {
  const type =
    typeof searchParams.type === "string" &&
    (searchParams.type === "movie" || searchParams.type === "tv")
      ? searchParams.type
      : "movie";

  // Fetch Genres (Always needed for controls and card mapping)
  const { movieGenres, tvGenres, genreMap } = await getUnifiedGenreMap();

  // Current genres for controls (depend on type)
  const currentGenres = type === "movie" ? movieGenres : tvGenres;

  // Fetch Data
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page, 10) : 1;

  const data = q
    ? await searchMedia(q, type, page)
    : await (async () => {
        const sortByParam =
          typeof searchParams.sort_by === "string" ? searchParams.sort_by : undefined;
        const discoverParams: Record<string, string | number | boolean | undefined> = {
          page,
          sort_by:
            type === "tv" && sortByParam?.startsWith("primary_release_date")
              ? sortByParam.replace("primary_release_date", "first_air_date")
              : sortByParam,
          with_genres:
            typeof searchParams.with_genres === "string" ? searchParams.with_genres : undefined,
        };

        if (typeof searchParams.decade === "string" && searchParams.decade !== "all") {
          const decadeVal = Number.parseInt(searchParams.decade, 10);
          if (!Number.isNaN(decadeVal)) {
            const range = buildTmdbDecadeDateRange(decadeVal, type);
            discoverParams[range.gteKey] = range.gteVal;
            discoverParams[range.lteKey] = range.lteVal;
          }
        }

        const dateKeys = [
          "primary_release_date.gte",
          "primary_release_date.lte",
          "first_air_date.gte",
          "first_air_date.lte",
        ] as const;

        dateKeys.forEach((k) => {
          if (typeof searchParams[k] === "string") {
            discoverParams[k] = searchParams[k] as string;
          }
        });

        return discoverMedia(type, discoverParams);
      })();

  return {
    results: data.results,
    genreMap,
    currentGenres,
    currentPage: data.page,
    totalPages: data.total_pages,
  };
}
