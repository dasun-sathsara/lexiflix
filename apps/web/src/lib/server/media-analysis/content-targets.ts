import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { content } from "@/lib/server/db/schema";
import {
  type ResolveContentTargetInput,
  resolveContentTargetInputSchema,
} from "@/lib/server/media-analysis/contracts";
import {
  getMovieDetails,
  getTvDetails,
  getTvSeasonDetails,
  type TMDBMovieDetails,
  type TMDBTvDetails,
  type TMDBTvSeasonDetails,
} from "@/lib/tmdb";

type ContentRow = typeof content.$inferSelect;

type BaseResolvedContentTarget = {
  status: "resolved";
  content: ContentRow;
};

export type ResolvedMovieContentTarget = BaseResolvedContentTarget & {
  targetKind: "movie";
};

export type ResolvedSeasonContentTarget = BaseResolvedContentTarget & {
  targetKind: "season";
  show: {
    tmdbShowId: number;
    title: string;
    seasonNumber: number;
    availableSeasonCount: number | null;
  };
};

export type SeasonSelectionRequiredTarget = {
  status: "season_selection_required";
  mediaType: "tv";
  tmdbId: number;
  showTitle: string;
  availableSeasonCount: number | null;
};

export type ResolvedContentTarget =
  | ResolvedMovieContentTarget
  | ResolvedSeasonContentTarget
  | SeasonSelectionRequiredTarget;

function parseTmdbDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeOverview(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildMovieContentValues(detail: TMDBMovieDetails) {
  const now = new Date();

  return {
    kind: "movie" as const,
    tmdbMovieId: detail.id,
    tmdbShowId: null,
    tmdbSeasonNumber: null,
    tmdbSeasonId: null,
    title: detail.title,
    originalTitle: detail.original_title || detail.title,
    overview: normalizeOverview(detail.overview),
    originalLanguage: detail.original_language,
    posterPath: detail.poster_path,
    backdropPath: detail.backdrop_path,
    releaseDate: parseTmdbDate(detail.release_date),
    firstAirDate: null,
    runtimeMinutes: detail.runtime ?? null,
    episodeCount: null,
    voteAverage: detail.vote_average ?? null,
    voteCount: detail.vote_count ?? null,
    tmdbRaw: detail as unknown as Record<string, unknown>,
    lastTmdbSyncedAt: now,
    updatedAt: now,
  };
}

function buildSeasonContentValues(show: TMDBTvDetails, season: TMDBTvSeasonDetails) {
  const seasonLabel = season.name?.trim() || `Season ${season.season_number}`;
  const showTitle = show.name?.trim() || show.original_name?.trim() || `Show ${show.id}`;
  const originalShowTitle = show.original_name?.trim() || showTitle;
  const now = new Date();

  return {
    kind: "season" as const,
    tmdbMovieId: null,
    tmdbShowId: show.id,
    tmdbSeasonNumber: season.season_number,
    tmdbSeasonId: season.id,
    title: `${showTitle} - ${seasonLabel}`,
    originalTitle: `${originalShowTitle} - ${seasonLabel}`,
    overview: normalizeOverview(season.overview) ?? normalizeOverview(show.overview),
    originalLanguage: show.original_language,
    posterPath: season.poster_path ?? show.poster_path,
    backdropPath: show.backdrop_path,
    releaseDate: null,
    firstAirDate: parseTmdbDate(season.air_date),
    runtimeMinutes: null,
    episodeCount: season.episodes?.length ?? null,
    voteAverage: show.vote_average ?? null,
    voteCount: show.vote_count ?? null,
    tmdbRaw: {
      show,
      season,
    } as Record<string, unknown>,
    lastTmdbSyncedAt: now,
    updatedAt: now,
  };
}

async function getExistingMovieContent(tmdbMovieId: number) {
  const [row] = await db
    .select()
    .from(content)
    .where(and(eq(content.kind, "movie"), eq(content.tmdbMovieId, tmdbMovieId)))
    .limit(1);

  return row ?? null;
}

async function getExistingSeasonContent(tmdbShowId: number, seasonNumber: number) {
  const [row] = await db
    .select()
    .from(content)
    .where(
      and(
        eq(content.kind, "season"),
        eq(content.tmdbShowId, tmdbShowId),
        eq(content.tmdbSeasonNumber, seasonNumber),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function persistMovieContent(detail: TMDBMovieDetails) {
  const values = buildMovieContentValues(detail);

  const existing = await getExistingMovieContent(detail.id);

  if (existing) {
    const [updated] = await db
      .update(content)
      .set(values)
      .where(eq(content.id, existing.id))
      .returning();

    return updated;
  }

  const [inserted] = await db
    .insert(content)
    .values({
      id: crypto.randomUUID(),
      ...values,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    return inserted;
  }

  const collided = await getExistingMovieContent(detail.id);
  if (!collided) {
    throw new Error("Failed to resolve a durable movie content row after insert collision.");
  }

  const [updated] = await db
    .update(content)
    .set(values)
    .where(eq(content.id, collided.id))
    .returning();

  return updated;
}

async function persistSeasonContent(show: TMDBTvDetails, season: TMDBTvSeasonDetails) {
  const values = buildSeasonContentValues(show, season);

  const existing = await getExistingSeasonContent(show.id, season.season_number);

  if (existing) {
    const [updated] = await db
      .update(content)
      .set(values)
      .where(eq(content.id, existing.id))
      .returning();

    return updated;
  }

  const [inserted] = await db
    .insert(content)
    .values({
      id: crypto.randomUUID(),
      ...values,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    return inserted;
  }

  const collided = await getExistingSeasonContent(show.id, season.season_number);
  if (!collided) {
    throw new Error("Failed to resolve a durable season content row after insert collision.");
  }

  const [updated] = await db
    .update(content)
    .set(values)
    .where(eq(content.id, collided.id))
    .returning();

  return updated;
}

export async function resolveOrCreateContentTarget(
  input: ResolveContentTargetInput,
): Promise<ResolvedContentTarget> {
  const parsed = resolveContentTargetInputSchema.parse(input);

  if (parsed.mediaType === "movie") {
    const movie = await getMovieDetails(parsed.tmdbId);
    const contentRow = await persistMovieContent(movie);

    return {
      status: "resolved",
      targetKind: "movie",
      content: contentRow,
    };
  }

  const show = await getTvDetails(parsed.tmdbId);

  if (!parsed.seasonNumber) {
    return {
      status: "season_selection_required",
      mediaType: "tv",
      tmdbId: parsed.tmdbId,
      showTitle: show.name,
      availableSeasonCount: show.number_of_seasons ?? null,
    };
  }

  const availableSeasonCount = show.number_of_seasons ?? null;
  if (availableSeasonCount !== null && parsed.seasonNumber > availableSeasonCount) {
    throw new Error(
      `Season ${parsed.seasonNumber} does not exist for TMDB show ${parsed.tmdbId}. Available seasons: ${availableSeasonCount}.`,
    );
  }

  const season = await getTvSeasonDetails(parsed.tmdbId, parsed.seasonNumber);
  const contentRow = await persistSeasonContent(show, season);

  return {
    status: "resolved",
    targetKind: "season",
    content: contentRow,
    show: {
      tmdbShowId: show.id,
      title: show.name,
      seasonNumber: season.season_number,
      availableSeasonCount,
    },
  };
}
