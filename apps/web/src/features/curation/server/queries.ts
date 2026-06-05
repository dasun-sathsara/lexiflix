import "server-only";

import { and, asc, desc, eq, type SQL, sql } from "drizzle-orm";
import type {
  AnnotatedTMDBResult,
  CuratedAdminCatalogFilter,
  CuratedAdminQueryState,
  CuratedCatalogEntry,
  CuratedCatalogListFilters,
} from "@/features/curation/types";
import { buildCuratedAdminDiscoverParams } from "@/features/curation/utils";
import {
  extractMovieCertification,
  extractTvCertification,
} from "@/lib/integrations/tmdb/certification";
import {
  discoverMedia,
  getMovieDetails,
  getTvDetails,
  searchMedia,
  type TMDBMediaType,
  type TMDBMovieDetails,
  type TMDBTvDetails,
} from "@/lib/integrations/tmdb/client";
import { getUnifiedGenreMap } from "@/lib/integrations/tmdb/genres";
import { extractDecade, toNumericString } from "@/lib/integrations/tmdb/mappers";
import { extractYear } from "@/lib/primitives/dates";
import { db } from "@/lib/server/db";
import type { CuratedGenreSnapshot } from "@/lib/server/db/json-contracts";
import { curatedEntry } from "@/lib/server/db/schema";
import { toIso } from "@/lib/server/utils/datetime";

function getMovieContentRating(detail: TMDBMovieDetails) {
  return extractMovieCertification(detail);
}

function getTvContentRating(detail: TMDBTvDetails) {
  return extractTvCertification(detail);
}

function buildDisplaySubtitle(mediaType: TMDBMediaType, seasonCountSnapshot: number | null) {
  if (mediaType !== "tv" || !seasonCountSnapshot) {
    return null;
  }

  return `${seasonCountSnapshot} season${seasonCountSnapshot === 1 ? "" : "s"}`;
}

function normalizeMovieSnapshot(detail: TMDBMovieDetails) {
  const releaseDate = detail.release_date || null;
  const releaseYear = extractYear(releaseDate);
  const genres: CuratedGenreSnapshot[] = detail.genres.map((genre) => ({
    id: genre.id,
    name: genre.name,
  }));

  return {
    sourceProvider: "tmdb" as const,
    mediaType: "movie" as const,
    tmdbId: detail.id,
    title: detail.title,
    originalTitle: detail.original_title || detail.title,
    displaySubtitle: null,
    overview: detail.overview || null,
    releaseDate,
    releaseYear,
    decade: extractDecade(releaseYear),
    posterPath: detail.poster_path,
    backdropPath: detail.backdrop_path,
    originalLanguage: detail.original_language,
    originCountries: [],
    genreIds: genres.map((genre) => genre.id),
    genres,
    imdbId: detail.imdb_id,
    contentRating: getMovieContentRating(detail),
    popularity: toNumericString(detail.popularity, 3),
    voteAverage: toNumericString(detail.vote_average, 2),
    voteCount: detail.vote_count ?? null,
    seasonCountSnapshot: null,
    rawTmdb: detail as unknown as Record<string, unknown>,
    fetchedAt: new Date().toISOString(),
  };
}

function normalizeTvSnapshot(detail: TMDBTvDetails) {
  const releaseDate = detail.first_air_date || null;
  const releaseYear = extractYear(releaseDate);
  const genres: CuratedGenreSnapshot[] = detail.genres.map((genre) => ({
    id: genre.id,
    name: genre.name,
  }));
  const seasonCountSnapshot = detail.number_of_seasons ?? null;

  return {
    sourceProvider: "tmdb" as const,
    mediaType: "tv" as const,
    tmdbId: detail.id,
    title: detail.name,
    originalTitle: detail.original_name || detail.name,
    displaySubtitle: buildDisplaySubtitle("tv", seasonCountSnapshot),
    overview: detail.overview || null,
    releaseDate,
    releaseYear,
    decade: extractDecade(releaseYear),
    posterPath: detail.poster_path,
    backdropPath: detail.backdrop_path,
    originalLanguage: detail.original_language,
    originCountries: detail.origin_country ?? [],
    genreIds: genres.map((genre) => genre.id),
    genres,
    imdbId: detail.external_ids?.imdb_id ?? null,
    contentRating: getTvContentRating(detail),
    popularity: toNumericString(detail.popularity, 3),
    voteAverage: toNumericString(detail.vote_average, 2),
    voteCount: detail.vote_count ?? null,
    seasonCountSnapshot,
    rawTmdb: detail as unknown as Record<string, unknown>,
    fetchedAt: new Date().toISOString(),
  };
}

export async function buildCuratedSnapshotFromTmdb(mediaType: TMDBMediaType, tmdbId: number) {
  if (mediaType === "movie") {
    const detail = await getMovieDetails(tmdbId);
    return normalizeMovieSnapshot(detail);
  }

  const detail = await getTvDetails(tmdbId);
  return normalizeTvSnapshot(detail);
}

export function mapCuratedEntry(row: typeof curatedEntry.$inferSelect): CuratedCatalogEntry {
  return {
    id: row.id,
    sourceProvider: row.sourceProvider,
    mediaType: row.mediaType,
    curationScope: row.curationScope,
    tmdbId: row.tmdbId,
    title: row.title,
    originalTitle: row.originalTitle,
    displaySubtitle: row.displaySubtitle ?? null,
    overview: row.overview ?? null,
    releaseDate: row.releaseDate ?? null,
    releaseYear: row.releaseYear ?? null,
    decade: row.decade ?? null,
    posterPath: row.posterPath ?? null,
    backdropPath: row.backdropPath ?? null,
    originalLanguage: row.originalLanguage ?? null,
    originCountries: row.originCountries,
    genreIds: row.genreIds,
    genres: row.genres,
    imdbId: row.imdbId ?? null,
    contentRating: row.contentRating ?? null,
    popularity: row.tmdbPopularity,
    voteAverage: row.voteAverage,
    voteCount: row.voteCount ?? null,
    seasonCountSnapshot: row.seasonCountSnapshot ?? null,
    rawTmdb: row.tmdbSnapshot,
    fetchedAt: toIso(row.lastTmdbSyncedAt),
    contentId: row.contentId ?? null,
    isPublished: row.isPublished,
    featuredRank: row.featuredRank ?? null,
    curatedByUserId: row.curatedByUserId ?? null,
    curatedAt: toIso(row.curatedAt),
    updatedAt: row.updatedAt.toISOString(),
    level: row.level ?? null,
  };
}

function buildFilters(filters: CuratedCatalogListFilters = {}) {
  const clauses: SQL[] = [];

  if (filters.mediaType) {
    clauses.push(eq(curatedEntry.mediaType, filters.mediaType));
  }

  if (typeof filters.isPublished === "boolean") {
    clauses.push(eq(curatedEntry.isPublished, filters.isPublished));
  }

  if (filters.level) {
    clauses.push(eq(curatedEntry.level, filters.level));
  }

  return clauses.length > 0 ? and(...clauses) : undefined;
}

const curatedOrderBy = [
  sql`${curatedEntry.featuredRank} asc nulls last`,
  desc(curatedEntry.curatedAt),
  asc(curatedEntry.title),
] as const;

export async function listPublishedCuratedEntries(
  filters: Omit<CuratedCatalogListFilters, "isPublished"> = {},
) {
  const rows = await db
    .select()
    .from(curatedEntry)
    .where(buildFilters({ ...filters, isPublished: true }))
    .orderBy(...curatedOrderBy)
    .limit(filters.limit ?? 48);

  return rows.map(mapCuratedEntry);
}

export async function listCuratedEntriesForAdmin(filters: CuratedCatalogListFilters = {}) {
  const rows = await db
    .select()
    .from(curatedEntry)
    .where(buildFilters(filters))
    .orderBy(...curatedOrderBy)
    .limit(filters.limit ?? 100);

  return rows.map(mapCuratedEntry);
}

export async function getCuratedEntryByMediaAndTmdbId(mediaType: "movie" | "tv", tmdbId: number) {
  const [row] = await db
    .select()
    .from(curatedEntry)
    .where(and(eq(curatedEntry.mediaType, mediaType), eq(curatedEntry.tmdbId, tmdbId)))
    .limit(1);

  return row ? mapCuratedEntry(row) : null;
}

export async function getCuratedAdminView({
  queryState,
  catalogFilter,
}: {
  queryState: CuratedAdminQueryState;
  catalogFilter: CuratedAdminCatalogFilter;
}) {
  // Parallel fetch: catalog entries + both genre lists (always needed)
  const [{ movieGenres, tvGenres, genreMap }, allEntries] = await Promise.all([
    getUnifiedGenreMap(),
    listCuratedEntriesForAdmin({ limit: 500 }),
  ]);

  // Build O(1) lookup set for cross-referencing TMDB results against catalog
  const curatedKeys = new Set<string>(allEntries.map((e) => `${e.mediaType}:${e.tmdbId}`));

  // Only fetch TMDB when in discover view — catalog view doesn't need it
  let discoverResults: AnnotatedTMDBResult[] = [];
  let discoverMeta = { page: 1, totalPages: 0, totalResults: 0 };

  if (queryState.view === "discover") {
    try {
      if (queryState.mode === "search" && queryState.query) {
        const data = await searchMedia(queryState.query, queryState.mediaType, queryState.page);
        discoverResults = data.results.map((r) => ({
          ...r,
          isCurated: curatedKeys.has(`${queryState.mediaType}:${r.id}`),
        }));
        discoverMeta = {
          page: data.page,
          totalPages: Math.min(data.total_pages, 500),
          totalResults: data.total_results,
        };
      } else if (queryState.mode === "browse") {
        const dp = buildCuratedAdminDiscoverParams(queryState);
        const data = await discoverMedia(queryState.mediaType, dp);
        discoverResults = data.results.map((r) => ({
          ...r,
          isCurated: curatedKeys.has(`${queryState.mediaType}:${r.id}`),
        }));
        discoverMeta = {
          page: data.page,
          totalPages: Math.min(data.total_pages, 500),
          totalResults: data.total_results,
        };
      }
    } catch {
      // TMDB errors are handled gracefully — results remain empty
    }
  }

  // Apply catalog view filters on the server before passing to the workspace
  const catalogEntries = allEntries.filter((e) => {
    if (catalogFilter.mediaType !== "all" && e.mediaType !== catalogFilter.mediaType) {
      return false;
    }
    if (catalogFilter.status === "published" && !e.isPublished) {
      return false;
    }
    if (catalogFilter.status === "hidden" && e.isPublished) {
      return false;
    }
    return true;
  });

  // Aggregate stats from the full (unfiltered) entry list
  const stats = {
    total: allEntries.length,
    published: allEntries.filter((e) => e.isPublished).length,
    movies: allEntries.filter((e) => e.mediaType === "movie").length,
    tv: allEntries.filter((e) => e.mediaType === "tv").length,
  };

  // Serve genre options for the currently active media type in the controls
  const genres = queryState.mediaType === "movie" ? movieGenres : tvGenres;

  return {
    catalogEntries,
    allEntriesCount: allEntries.length,
    stats,
    discoverResults,
    discoverMeta,
    genres,
    genreMap,
  };
}
