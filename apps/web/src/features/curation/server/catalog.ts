import { and, asc, desc, eq, type SQL, sql } from "drizzle-orm";

import type { CuratedCatalogEntry, CuratedCatalogListFilters } from "@/features/curation/lib/types";
import { db } from "@/lib/server/db";
import type { CuratedGenreSnapshot } from "@/lib/server/db/json-contracts";
import { curatedEntry } from "@/lib/server/db/schema";
import {
  getMovieDetails,
  getTvDetails,
  type TMDBMediaType,
  type TMDBMovieDetails,
  type TMDBTvDetails,
} from "@/lib/tmdb";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function extractYearFromDate(value: string | null) {
  if (!value) {
    return null;
  }

  const year = Number.parseInt(value.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function extractDecade(year: number | null) {
  if (!year) {
    return null;
  }

  return Math.floor(year / 10) * 10;
}

function toNumericString(value: number | null | undefined, fractionDigits: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return value.toFixed(fractionDigits);
}

function pickFirstNonEmpty(values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getMovieContentRating(detail: TMDBMovieDetails) {
  const allResults = detail.release_dates?.results ?? [];
  const usCertification = allResults
    .find((result) => result.iso_3166_1 === "US")
    ?.release_dates.map((entry) => entry.certification);

  const anyCertification = allResults.flatMap((result) =>
    result.release_dates.map((entry) => entry.certification),
  );

  return pickFirstNonEmpty([...(usCertification ?? []), ...anyCertification]);
}

function getTvContentRating(detail: TMDBTvDetails) {
  const allResults = detail.content_ratings?.results ?? [];
  const usRating = allResults.find((result) => result.iso_3166_1 === "US")?.rating;

  return pickFirstNonEmpty([usRating, ...allResults.map((result) => result.rating)]);
}

function buildDisplaySubtitle(mediaType: TMDBMediaType, seasonCountSnapshot: number | null) {
  if (mediaType !== "tv" || !seasonCountSnapshot) {
    return null;
  }

  return `${seasonCountSnapshot} season${seasonCountSnapshot === 1 ? "" : "s"}`;
}

function normalizeMovieSnapshot(detail: TMDBMovieDetails) {
  const releaseDate = detail.release_date || null;
  const releaseYear = extractYearFromDate(releaseDate);
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
  const releaseYear = extractYearFromDate(releaseDate);
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

export async function upsertCuratedEntryFromTmdb(
  mediaType: TMDBMediaType,
  tmdbId: number,
  adminUserId: string,
) {
  const snapshot = await buildCuratedSnapshotFromTmdb(mediaType, tmdbId);
  const syncedAt = snapshot.fetchedAt ? new Date(snapshot.fetchedAt) : new Date();

  const [row] = await db
    .insert(curatedEntry)
    .values({
      id: crypto.randomUUID(),
      sourceProvider: snapshot.sourceProvider,
      mediaType: snapshot.mediaType,
      curationScope: snapshot.mediaType === "movie" ? "movie" : "show",
      tmdbId: snapshot.tmdbId,
      tmdbTvId: snapshot.mediaType === "tv" ? snapshot.tmdbId : null,
      tmdbSeasonNumber: null,
      tmdbSeasonId: null,
      title: snapshot.title,
      originalTitle: snapshot.originalTitle,
      displaySubtitle: snapshot.displaySubtitle,
      overview: snapshot.overview,
      releaseDate: snapshot.releaseDate,
      releaseYear: snapshot.releaseYear,
      decade: snapshot.decade,
      posterPath: snapshot.posterPath,
      backdropPath: snapshot.backdropPath,
      originalLanguage: snapshot.originalLanguage,
      originCountries: snapshot.originCountries,
      genreIds: snapshot.genreIds,
      genres: snapshot.genres,
      imdbId: snapshot.imdbId,
      contentRating: snapshot.contentRating,
      tmdbPopularity: snapshot.popularity,
      voteAverage: snapshot.voteAverage,
      voteCount: snapshot.voteCount,
      seasonCountSnapshot: snapshot.seasonCountSnapshot,
      tmdbSnapshot: snapshot.rawTmdb as Record<string, unknown>,
      curatedByUserId: adminUserId,
      curatedAt: new Date(),
      lastTmdbSyncedAt: syncedAt,
    })
    .onConflictDoUpdate({
      target: [curatedEntry.mediaType, curatedEntry.tmdbId],
      set: {
        sourceProvider: snapshot.sourceProvider,
        curationScope: snapshot.mediaType === "movie" ? "movie" : "show",
        tmdbTvId: snapshot.mediaType === "tv" ? snapshot.tmdbId : null,
        tmdbSeasonNumber: null,
        tmdbSeasonId: null,
        title: snapshot.title,
        originalTitle: snapshot.originalTitle,
        displaySubtitle: snapshot.displaySubtitle,
        overview: snapshot.overview,
        releaseDate: snapshot.releaseDate,
        releaseYear: snapshot.releaseYear,
        decade: snapshot.decade,
        posterPath: snapshot.posterPath,
        backdropPath: snapshot.backdropPath,
        originalLanguage: snapshot.originalLanguage,
        originCountries: snapshot.originCountries,
        genreIds: snapshot.genreIds,
        genres: snapshot.genres,
        imdbId: snapshot.imdbId,
        contentRating: snapshot.contentRating,
        tmdbPopularity: snapshot.popularity,
        voteAverage: snapshot.voteAverage,
        voteCount: snapshot.voteCount,
        seasonCountSnapshot: snapshot.seasonCountSnapshot,
        tmdbSnapshot: snapshot.rawTmdb as Record<string, unknown>,
        curatedByUserId: adminUserId,
        lastTmdbSyncedAt: syncedAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  return mapCuratedEntry(row);
}

export async function setCuratedEntryPublishedState(id: string, isPublished: boolean) {
  const [row] = await db
    .update(curatedEntry)
    .set({
      isPublished,
      updatedAt: new Date(),
    })
    .where(eq(curatedEntry.id, id))
    .returning();

  return row ? mapCuratedEntry(row) : null;
}

export async function setCuratedEntryFeaturedRank(id: string, featuredRank: number | null) {
  const [row] = await db
    .update(curatedEntry)
    .set({
      featuredRank,
      updatedAt: new Date(),
    })
    .where(eq(curatedEntry.id, id))
    .returning();

  return row ? mapCuratedEntry(row) : null;
}

export async function reorderCuratedEntries(orderedIds: string[]) {
  if (orderedIds.length === 0) {
    return;
  }

  const now = new Date();

  // neon-http driver doesn't support transactions, so batch updates sequentially.
  for (let index = 0; index < orderedIds.length; index += 1) {
    const id = orderedIds[index];
    if (!id) continue;
    await db
      .update(curatedEntry)
      .set({ featuredRank: index + 1, updatedAt: now })
      .where(eq(curatedEntry.id, id));
  }
}

export async function deleteCuratedEntryById(id: string) {
  const [row] = await db.delete(curatedEntry).where(eq(curatedEntry.id, id)).returning();
  return row ? mapCuratedEntry(row) : null;
}
