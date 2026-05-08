import "server-only";

import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getCefrProfile } from "@/features/assessment/server/profile";
import type {
  MediaAnalysisItemView,
  MediaAnalysisSnapshot,
  MediaDetailPageData,
  MediaDetailView,
  PackGenerationSnapshot,
} from "@/features/media/types";
import {
  getLatestPackGenerationProgressForContent,
  getPackGenerationProgressView,
} from "@/features/pack-generation/server/queries";
import { getSettingsPreferences } from "@/features/settings/server/preferences";
import { db } from "@/lib/server/db";
import { contentAnalysisItem, contentAnalysisRun, vocabularyTerm } from "@/lib/server/db/schema";
import { resolveOrCreateContentTarget } from "@/lib/server/media-analysis/content-targets";
import { MEDIA_ANALYSIS_PIPELINE_VERSION } from "@/lib/server/media-analysis/contracts";
import { getContentAnalysisRunByFingerprint } from "@/lib/server/media-analysis/runs";
import type { TMDBMediaType, TMDBMovieDetails, TMDBTvDetails } from "@/lib/tmdb";
import { getMovieDetails, getTvDetails } from "@/lib/tmdb";

type ResolvedMovieDetail = {
  mediaType: "movie";
  detail: TMDBMovieDetails;
};

type ResolvedTvDetail = {
  mediaType: "tv";
  detail: TMDBTvDetails;
};

type ResolvedTmdbDetail = ResolvedMovieDetail | ResolvedTvDetail;
const MEDIA_ANALYSIS_FINGERPRINT = `media-analysis:${MEDIA_ANALYSIS_PIPELINE_VERSION}`;
const PUBLIC_ANALYSIS_FAILURE_MESSAGE =
  "Subtitle analysis could not be completed. Retry the analysis or try another title.";

function parseTmdbNotFound(error: unknown) {
  return error instanceof Error && error.message.includes("TMDB Error: 404");
}

async function resolveTmdbDetail(
  tmdbId: number,
  hintedType?: TMDBMediaType,
): Promise<ResolvedTmdbDetail> {
  if (hintedType === "movie") {
    return {
      mediaType: "movie",
      detail: await getMovieDetails(tmdbId),
    };
  }

  if (hintedType === "tv") {
    return {
      mediaType: "tv",
      detail: await getTvDetails(tmdbId),
    };
  }

  try {
    return {
      mediaType: "movie",
      detail: await getMovieDetails(tmdbId),
    };
  } catch (error) {
    if (!parseTmdbNotFound(error)) {
      throw error;
    }
  }

  try {
    return {
      mediaType: "tv",
      detail: await getTvDetails(tmdbId),
    };
  } catch (error) {
    if (!parseTmdbNotFound(error)) {
      throw error;
    }
  }

  notFound();
}

function mapMovieToView(detail: TMDBMovieDetails): MediaDetailView {
  return {
    tmdbId: detail.id,
    mediaType: "movie",
    title: detail.title,
    subtitle: null,
    overview: detail.overview || null,
    releaseYear: detail.release_date ? String(new Date(detail.release_date).getFullYear()) : null,
    runtimeMinutes: detail.runtime ?? null,
    genres: detail.genres.map((genre) => genre.name),
    voteAverage: detail.vote_average ?? null,
    voteCount: detail.vote_count ?? null,
    posterPath: detail.poster_path,
    backdropPath: detail.backdrop_path,
    selectedSeasonNumber: null,
    availableSeasonCount: null,
  };
}

function mapTvToView(detail: TMDBTvDetails, selectedSeasonNumber: number | null): MediaDetailView {
  return {
    tmdbId: detail.id,
    mediaType: "tv",
    title: detail.name,
    subtitle: selectedSeasonNumber ? `Season ${selectedSeasonNumber}` : null,
    overview: detail.overview || null,
    releaseYear: detail.first_air_date
      ? String(new Date(detail.first_air_date).getFullYear())
      : null,
    runtimeMinutes: null,
    genres: detail.genres.map((genre) => genre.name),
    voteAverage: detail.vote_average ?? null,
    voteCount: detail.vote_count ?? null,
    posterPath: detail.poster_path,
    backdropPath: detail.backdrop_path,
    selectedSeasonNumber,
    availableSeasonCount: detail.number_of_seasons ?? null,
  };
}

async function getCompletedItems(runId: string): Promise<MediaAnalysisItemView[]> {
  const rows = await db
    .select({
      id: contentAnalysisItem.id,
      termId: contentAnalysisItem.termId,
      kind: vocabularyTerm.kind,
      displayText: vocabularyTerm.displayText,
      baseCefrLevel: vocabularyTerm.baseCefrLevel,
      cefrLevel: contentAnalysisItem.cefrLevel,
      occurrenceCount: contentAnalysisItem.occurrenceCount,
      frequencyRank: contentAnalysisItem.frequencyRank,
      analysisSource: contentAnalysisItem.analysisSource,
      representativeContext: contentAnalysisItem.representativeContext,
      isSelectable: contentAnalysisItem.isSelectable,
    })
    .from(contentAnalysisItem)
    .innerJoin(vocabularyTerm, eq(contentAnalysisItem.termId, vocabularyTerm.id))
    .where(eq(contentAnalysisItem.analysisRunId, runId));

  return rows
    .sort((left, right) => {
      const leftRank = left.frequencyRank ?? Number.POSITIVE_INFINITY;
      const rightRank = right.frequencyRank ?? Number.POSITIVE_INFINITY;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      if (left.occurrenceCount !== right.occurrenceCount) {
        return right.occurrenceCount - left.occurrenceCount;
      }

      return left.displayText.localeCompare(right.displayText);
    })
    .slice(0, 24);
}

async function getGenerationSnapshotForContent(input: {
  userId: string;
  contentId: string;
}): Promise<PackGenerationSnapshot | null> {
  return getLatestPackGenerationProgressForContent(input);
}

/**
 * Fetches the snapshot state of a pack generation job by its durable job ID.
 */
export async function getPackGenerationSnapshotByJobId(input: {
  userId: string;
  jobId: string;
}): Promise<PackGenerationSnapshot | null> {
  return getPackGenerationProgressView(input);
}

/**
 * Retrieves the state and results of a media analysis run by its run ID.
 * Transforms the durable trigger.dev job state into a consistent snapshot view.
 */
export async function getAnalysisSnapshotByRunId(
  runId: string,
): Promise<MediaAnalysisSnapshot | null> {
  const [run] = await db
    .select()
    .from(contentAnalysisRun)
    .where(eq(contentAnalysisRun.id, runId))
    .limit(1);

  if (!run) {
    return null;
  }

  const status =
    run.status === "completed"
      ? "completed"
      : run.status === "failed"
        ? "failed"
        : run.status === "queued"
          ? "queued"
          : "running";

  return {
    runId: run.id,
    status,
    stage: run.stage,
    progressMessage: run.progressMessage ?? null,
    errorCode: run.errorCode ?? null,
    errorMessage: status === "failed" ? PUBLIC_ANALYSIS_FAILURE_MESSAGE : null,
    warnings: run.warnings ?? [],
    summary: run.summary ?? null,
    items: run.status === "completed" ? await getCompletedItems(run.id) : [],
  };
}

async function getAnalysisSnapshotForResolvedTarget(input: {
  contentId: string;
  pipelineFingerprint: string;
}): Promise<MediaAnalysisSnapshot> {
  const run = await getContentAnalysisRunByFingerprint(input.contentId, input.pipelineFingerprint);

  if (!run) {
    return {
      runId: null,
      status: "not_started",
      stage: null,
      progressMessage: null,
      errorCode: null,
      errorMessage: null,
      warnings: [],
      summary: null,
      items: [],
    };
  }

  const snapshot = await getAnalysisSnapshotByRunId(run.id);
  if (!snapshot) {
    throw new Error(`Content analysis run ${run.id} disappeared while building media detail data.`);
  }

  return snapshot;
}

/**
 * Orchestrates fetching all data required for the media detail page.
 * Retrieves TMDB data, looks for active analysis runs, and computes default pack generation settings.
 */
export async function getMediaDetailPageData(input: {
  tmdbId: number;
  userId: string;
  mediaTypeHint?: TMDBMediaType;
  seasonNumber?: number | null;
}): Promise<MediaDetailPageData> {
  const resolved = await resolveTmdbDetail(input.tmdbId, input.mediaTypeHint);
  const learnerProfile = await getCefrProfile(input.userId);
  const preferences = await getSettingsPreferences(input.userId);
  const learnerLevel = learnerProfile?.manualOverrideLevel ?? learnerProfile?.assessedLevel ?? null;
  const generationDefaults = {
    learnerCefrLevel: learnerLevel,
    frequencyPreference: preferences.frequencyPreference,
    selectedVocabularyTypes: preferences.studyVocabularyTypes,
    cefrWindowMode: preferences.generationCefrWindowMode,
    packSize: preferences.generationPackSizeDefault,
    knownTermHandling: preferences.generationKnownTermHandling,
    exampleSentenceCount: preferences.generationExampleSentenceCount,
    customInstructions: preferences.generationCustomInstructionsDefault,
  };

  if (resolved.mediaType === "movie") {
    const target = await resolveOrCreateContentTarget({
      mediaType: "movie",
      tmdbId: input.tmdbId,
    });

    if (!("content" in target)) {
      throw new Error(`Movie ${input.tmdbId} did not resolve to a durable content target.`);
    }

    return {
      media: mapMovieToView(resolved.detail),
      learnerLevel,
      analysis: await getAnalysisSnapshotForResolvedTarget({
        contentId: target.content.id,
        pipelineFingerprint: MEDIA_ANALYSIS_FINGERPRINT,
      }),
      generation: await getGenerationSnapshotForContent({
        userId: input.userId,
        contentId: target.content.id,
      }),
      generationDefaults,
    };
  }

  const selectedSeasonNumber = input.seasonNumber ?? null;
  const media = mapTvToView(resolved.detail, selectedSeasonNumber);

  if (!selectedSeasonNumber) {
    return {
      media,
      learnerLevel,
      analysis: {
        runId: null,
        status: "season_selection_required",
        stage: null,
        progressMessage: "Choose a season to start reusable subtitle analysis.",
        errorCode: null,
        errorMessage: null,
        warnings: [],
        summary: null,
        items: [],
      },
      generation: null,
      generationDefaults,
    };
  }

  const target = await resolveOrCreateContentTarget({
    mediaType: "tv",
    tmdbId: input.tmdbId,
    seasonNumber: selectedSeasonNumber,
  });

  if (target.status !== "resolved") {
    return {
      media,
      learnerLevel,
      analysis: {
        runId: null,
        status: "season_selection_required",
        stage: null,
        progressMessage: "Choose a valid season to start reusable subtitle analysis.",
        errorCode: null,
        errorMessage: null,
        warnings: [],
        summary: null,
        items: [],
      },
      generation: null,
      generationDefaults,
    };
  }

  return {
    media,
    learnerLevel,
    analysis: await getAnalysisSnapshotForResolvedTarget({
      contentId: target.content.id,
      pipelineFingerprint: MEDIA_ANALYSIS_FINGERPRINT,
    }),
    generation: await getGenerationSnapshotForContent({
      userId: input.userId,
      contentId: target.content.id,
    }),
    generationDefaults,
  };
}

/**
 * Attempts to find the latest completed or active analysis snapshot for a given content target
 * (e.g., a specific TMDB movie ID or TV season).
 */
export async function getAnalysisSnapshotForContentTarget(input: {
  tmdbId: number;
  mediaType: TMDBMediaType;
  seasonNumber?: number | null;
}): Promise<MediaAnalysisSnapshot> {
  const target = await resolveOrCreateContentTarget({
    mediaType: input.mediaType,
    tmdbId: input.tmdbId,
    ...(input.mediaType === "tv" && input.seasonNumber ? { seasonNumber: input.seasonNumber } : {}),
  });

  if (target.status !== "resolved") {
    return {
      runId: null,
      status: "season_selection_required",
      stage: null,
      progressMessage: "Choose a season to start reusable subtitle analysis.",
      errorCode: null,
      errorMessage: null,
      warnings: [],
      summary: null,
      items: [],
    };
  }

  return getAnalysisSnapshotForResolvedTarget({
    contentId: target.content.id,
    pipelineFingerprint: MEDIA_ANALYSIS_FINGERPRINT,
  });
}

/**
 * Resolves an analysis snapshot using a specific run ID if provided, otherwise falling back
 * to the latest known snapshot for the given content target.
 */
export async function getAnalysisSnapshotForRunAndContent(input: {
  runId: string;
  tmdbId: number;
  mediaType: TMDBMediaType;
  seasonNumber?: number | null;
}) {
  const snapshot = await getAnalysisSnapshotByRunId(input.runId);
  if (!snapshot) {
    return null;
  }

  const target = await resolveOrCreateContentTarget({
    mediaType: input.mediaType,
    tmdbId: input.tmdbId,
    ...(input.mediaType === "tv" && input.seasonNumber ? { seasonNumber: input.seasonNumber } : {}),
  });

  if (target.status !== "resolved") {
    return null;
  }

  const [run] = await db
    .select()
    .from(contentAnalysisRun)
    .where(
      and(
        eq(contentAnalysisRun.id, input.runId),
        eq(contentAnalysisRun.contentId, target.content.id),
      ),
    )
    .limit(1);

  return run ? snapshot : null;
}
