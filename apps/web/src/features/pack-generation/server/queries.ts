import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/server/db";
import type { WorkflowEventPayload } from "@/lib/server/db/json-contracts";
import { content, pack, packGenerationJob, packGenerationJobEvent } from "@/lib/server/db/schema";
import { IMAGE_BASE_URL, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
import type {
  PackGenerationProgressEvent,
  PackGenerationProgressView,
  PackGenerationRequestSummary,
} from "../types";

const RECENT_VISIBLE_JOB_LIMIT = 8;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function contentSubtitle(row: typeof content.$inferSelect) {
  return row.kind === "season" && row.tmdbSeasonNumber ? `Season ${row.tmdbSeasonNumber}` : null;
}

function contentMediaHref(row: typeof content.$inferSelect) {
  if (row.kind === "movie" && row.tmdbMovieId) {
    return `/media/${row.tmdbMovieId}?type=movie`;
  }
  if (row.kind === "season" && row.tmdbShowId && row.tmdbSeasonNumber) {
    return `/media/${row.tmdbShowId}?type=tv&season=${row.tmdbSeasonNumber}`;
  }
  return null;
}

function buildTmdbImageUrl(path: string | null, size: string) {
  return path ? `${IMAGE_BASE_URL}${size}${path}` : null;
}

function requestSummary(
  request: typeof packGenerationJob.$inferSelect.requestSnapshot,
): PackGenerationRequestSummary {
  return {
    learnerCefrLevel: request.learnerCefrLevel,
    frequencyPreference: request.frequencyPreference,
    selectedVocabularyTypes: request.selectedVocabularyTypes,
    cefrWindowMode: request.cefrWindowMode,
    packSize: request.packSize,
    knownTermHandling: request.knownTermHandling,
    exampleSentenceCount: request.exampleSentenceCount,
    hasCustomInstructions: Boolean(request.customInstructions),
    forceRegenerate: request.forceRegenerate,
  };
}

function payloadWarnings(payload: WorkflowEventPayload | null | undefined) {
  const warnings = payload?.warnings;
  return Array.isArray(warnings)
    ? warnings.filter((warning): warning is string => typeof warning === "string")
    : [];
}

function mapEvent(row: typeof packGenerationJobEvent.$inferSelect): PackGenerationProgressEvent {
  return {
    id: row.id,
    stage: row.stage,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}

async function mapJobView({
  job,
  contentRow,
  includeEvents,
}: {
  job: typeof packGenerationJob.$inferSelect;
  contentRow: typeof content.$inferSelect;
  includeEvents: boolean;
}): Promise<PackGenerationProgressView> {
  const generatedPack = await db.query.pack.findFirst({
    where: and(eq(pack.userId, job.userId), eq(pack.sourceJobId, job.id)),
  });
  const eventRows = includeEvents
    ? await db.query.packGenerationJobEvent.findMany({
        where: eq(packGenerationJobEvent.jobId, job.id),
        orderBy: desc(packGenerationJobEvent.createdAt),
      })
    : [];
  const warnings = eventRows.flatMap((event) => payloadWarnings(event.payload));

  return {
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    progressMessage: job.progressMessage,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    warnings,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    startedAt: toIso(job.startedAt),
    completedAt: toIso(job.completedAt),
    content: {
      contentId: contentRow.id,
      title: contentRow.title,
      subtitle: contentSubtitle(contentRow),
      posterUrl: buildTmdbImageUrl(contentRow.posterPath, TMDB_IMAGE_SIZES.poster.md),
      mediaHref: contentMediaHref(contentRow),
    },
    request: requestSummary(job.requestSnapshot),
    packId: generatedPack?.id ?? null,
    packHref: generatedPack ? `/pack/${generatedPack.id}` : null,
    progressHref: `/generation/${job.id}`,
    events: eventRows.map(mapEvent),
  };
}

export async function getPackGenerationProgressView({
  userId,
  jobId,
  includeEvents = false,
}: {
  userId: string;
  jobId: string;
  includeEvents?: boolean;
}) {
  const row = await db
    .select({ job: packGenerationJob, content })
    .from(packGenerationJob)
    .innerJoin(content, eq(content.id, packGenerationJob.contentId))
    .where(and(eq(packGenerationJob.userId, userId), eq(packGenerationJob.id, jobId)))
    .limit(1);

  const first = row[0];
  return first ? mapJobView({ job: first.job, contentRow: first.content, includeEvents }) : null;
}

export async function getLatestPackGenerationProgressForContent({
  userId,
  contentId,
}: {
  userId: string;
  contentId: string;
}) {
  const row = await db
    .select({ job: packGenerationJob, content })
    .from(packGenerationJob)
    .innerJoin(content, eq(content.id, packGenerationJob.contentId))
    .where(and(eq(packGenerationJob.userId, userId), eq(packGenerationJob.contentId, contentId)))
    .orderBy(desc(packGenerationJob.createdAt))
    .limit(1);

  const first = row[0];
  return first
    ? mapJobView({ job: first.job, contentRow: first.content, includeEvents: false })
    : null;
}

export async function listPackGenerationProgressForDecks({ userId }: { userId: string }) {
  const rows = await db
    .select({ job: packGenerationJob, content })
    .from(packGenerationJob)
    .innerJoin(content, eq(content.id, packGenerationJob.contentId))
    .where(
      and(
        eq(packGenerationJob.userId, userId),
        inArray(packGenerationJob.status, ["queued", "running", "failed", "completed"]),
      ),
    )
    .orderBy(desc(packGenerationJob.updatedAt))
    .limit(RECENT_VISIBLE_JOB_LIMIT);

  return Promise.all(
    rows.map((row) => mapJobView({ job: row.job, contentRow: row.content, includeEvents: false })),
  );
}
