import type { TMDBMediaType, TMDBResult } from "@/lib/integrations/tmdb/contracts";
import type {
  CuratedCurationScope,
  CuratedGenreSnapshot,
  CuratedMediaType,
  CuratedSourceProvider,
  StoredCefrLevel,
} from "@/lib/server/db/json-contracts";

export type { CuratedCurationScope, CuratedGenreSnapshot, CuratedMediaType, CuratedSourceProvider };

export interface CuratedItemSnapshot {
  sourceProvider: CuratedSourceProvider;
  mediaType: CuratedMediaType;
  tmdbId: number;
  title: string;
  originalTitle: string;
  displaySubtitle: string | null;
  overview: string | null;
  releaseDate: string | null;
  releaseYear: number | null;
  decade: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  originalLanguage: string | null;
  originCountries: string[];
  genreIds: number[];
  genres: CuratedGenreSnapshot[];
  imdbId: string | null;
  contentRating: string | null;
  popularity: string | null;
  voteAverage: string | null;
  voteCount: number | null;
  seasonCountSnapshot: number | null;
  rawTmdb: unknown;
  fetchedAt: string | null;
}

export interface CuratedCatalogEntry extends CuratedItemSnapshot {
  id: string;
  curationScope: CuratedCurationScope;
  contentId: string | null;
  isPublished: boolean;
  featuredRank: number | null;
  curatedByUserId: string | null;
  curatedAt: string | null;
  updatedAt: string;
  level: StoredCefrLevel | null;
}

export type CuratedCatalogListFilters = {
  mediaType?: CuratedMediaType;
  isPublished?: boolean;
  limit?: number;
  level?: StoredCefrLevel;
};

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

export type AnnotatedTMDBResult = TMDBResult & { isCurated: boolean };

export type CuratedAdminCatalogFilter = {
  mediaType: "all" | "movie" | "tv";
  status: "all" | "published" | "hidden";
};
