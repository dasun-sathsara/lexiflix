import { and, asc, desc, eq, type SQL, sql } from "drizzle-orm";

import type { CuratedCatalogEntry, CuratedCatalogListFilters } from "@/features/curation/lib/types";
import { db } from "@/lib/server/db";
import { curatedEntry } from "@/lib/server/db/schema";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function mapCuratedEntry(row: typeof curatedEntry.$inferSelect): CuratedCatalogEntry {
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
    fetchedAt: toIsoString(row.lastTmdbSyncedAt),
    contentId: row.contentId ?? null,
    isPublished: row.isPublished,
    featuredRank: row.featuredRank ?? null,
    curatedByUserId: row.curatedByUserId ?? null,
    curatedAt: toIsoString(row.curatedAt),
    updatedAt: row.updatedAt.toISOString(),
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
