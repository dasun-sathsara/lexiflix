import "server-only";

import { eq } from "drizzle-orm";
import { buildCuratedSnapshotFromTmdb, mapCuratedEntry } from "@/features/curation/server/queries";
import type { TMDBMediaType } from "@/lib/integrations/tmdb/client";
import { db } from "@/lib/server/db";
import type { StoredCefrLevel } from "@/lib/server/db/json-contracts";
import { curatedEntry } from "@/lib/server/db/schema";

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

export async function setCuratedEntryLevel(id: string, level: StoredCefrLevel | null) {
  const [row] = await db
    .update(curatedEntry)
    .set({
      level,
      updatedAt: new Date(),
    })
    .where(eq(curatedEntry.id, id))
    .returning();

  return row ? mapCuratedEntry(row) : null;
}
