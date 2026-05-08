import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { buildContentMediaHref } from "@/features/media/lib/content-media";
import {
  getGenerationStageCopy,
  PUBLIC_GENERATION_FAILURE_MESSAGE,
} from "@/features/pack-generation/lib/status";
import { db } from "@/lib/server/db";
import type { WorkflowEventPayload } from "@/lib/server/db/json-contracts";
import { content, pack, packGenerationJob, packGenerationJobEvent } from "@/lib/server/db/schema";
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
import type {
  PackGenerationProgressEvent,
  PackGenerationProgressView,
  PackGenerationRequestSummary,
} from "../types";

const RECENT_VISIBLE_JOB_LIMIT = 8;
const TECHNICAL_MESSAGE_PATTERN =
  /\b(neon|driver|transaction|constraint|database|sql|trigger|r2|s3|aws|api key|stack|exception)\b/i;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function contentSubtitle(row: typeof content.$inferSelect) {
  return row.kind === "season" && row.tmdbSeasonNumber ? `Season ${row.tmdbSeasonNumber}` : null;
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

function publicWarningMessage(message: string) {
  return TECHNICAL_MESSAGE_PATTERN.test(message)
    ? "Some optional study assets could not be created."
    : message;
}

function mapEvent(row: typeof packGenerationJobEvent.$inferSelect): PackGenerationProgressEvent {
  return {
    id: row.id,
    stage: row.stage,
    message:
      row.stage === "failed"
        ? PUBLIC_GENERATION_FAILURE_MESSAGE
        : getGenerationStageCopy(row.stage).description,
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
        orderBy: asc(packGenerationJobEvent.createdAt),
      })
    : [];
  const warnings = eventRows
    .flatMap((event) => payloadWarnings(event.payload))
    .map(publicWarningMessage);

  return {
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    progressMessage:
      job.status === "failed"
        ? PUBLIC_GENERATION_FAILURE_MESSAGE
        : (job.progressMessage ?? getGenerationStageCopy(job.stage).description),
    errorCode: job.errorCode,
    errorMessage: job.status === "failed" ? PUBLIC_GENERATION_FAILURE_MESSAGE : null,
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
      mediaHref: buildContentMediaHref(contentRow),
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
