"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/server/db";
import {
  content,
  contentAnalysisItem,
  contentAnalysisRun,
  contentAnalysisRunEvent,
  pack,
  packGenerationJob,
  packGenerationJobEvent,
  packItem,
  packItemContent,
  reviewEvent,
  userStreak,
  userTermState,
  vocabularyTerm,
} from "@/lib/server/db/schema";

interface ScopedInput {
  scope: "media" | "global";
  tmdbId?: number;
  mediaType?: "movie" | "tv";
  seasonNumber?: number | null;
}

/**
 * Helper to resolve the contentId for a given tmdbId, mediaType, and seasonNumber
 */
async function resolveContentId(
  tmdbId?: number,
  mediaType?: "movie" | "tv",
  seasonNumber?: number | null,
): Promise<string | null> {
  if (!tmdbId || !mediaType) return null;

  if (mediaType === "movie") {
    const [row] = await db
      .select({ id: content.id })
      .from(content)
      .where(and(eq(content.kind, "movie"), eq(content.tmdbMovieId, tmdbId)))
      .limit(1);
    return row?.id ?? null;
  }

  // tv/season
  const [row] = await db
    .select({ id: content.id })
    .from(content)
    .where(
      and(
        eq(content.kind, "season"),
        eq(content.tmdbShowId, tmdbId),
        eq(content.tmdbSeasonNumber, seasonNumber ?? 1),
      ),
    )
    .limit(1);
  return row?.id ?? null;
}

export async function clearDecksAndProgressAction(
  input: ScopedInput,
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireAdmin();

    const { scope, tmdbId, mediaType, seasonNumber } = input;

    if (scope === "media") {
      const contentId = await resolveContentId(tmdbId, mediaType, seasonNumber);

      if (!contentId) {
        return {
          ok: true,
          data: { message: "No database records exist for this media item." },
        };
      }

      // Find packs for this content
      const packs = await db
        .select({ id: pack.id })
        .from(pack)
        .where(eq(pack.contentId, contentId));
      const packIds = packs.map((p) => p.id);

      if (packIds.length > 0) {
        // Find pack items for these packs
        const packItems = await db
          .select({ id: packItem.id })
          .from(packItem)
          .where(inArray(packItem.packId, packIds));
        const packItemIds = packItems.map((pi) => pi.id);

        if (packItemIds.length > 0) {
          // Delete reviews
          await db.delete(reviewEvent).where(inArray(reviewEvent.packItemId, packItemIds));
          // Delete pack item content
          await db.delete(packItemContent).where(inArray(packItemContent.packItemId, packItemIds));
          // Delete pack items
          await db.delete(packItem).where(inArray(packItem.packId, packIds));
        }

        // Delete packs
        await db.delete(pack).where(eq(pack.contentId, contentId));
      }

      // Delete generation jobs
      const jobs = await db
        .select({ id: packGenerationJob.id })
        .from(packGenerationJob)
        .where(eq(packGenerationJob.contentId, contentId));
      const jobIds = jobs.map((j) => j.id);

      if (jobIds.length > 0) {
        await db
          .delete(packGenerationJobEvent)
          .where(inArray(packGenerationJobEvent.jobId, jobIds));
        await db.delete(packGenerationJob).where(eq(packGenerationJob.contentId, contentId));
      }

      revalidatePath("/", "layout");
      return {
        ok: true,
        data: { message: "Successfully cleared decks and progress for this media." },
      };
    }

    // Global clear
    await db.delete(reviewEvent);
    await db.delete(packItemContent);
    await db.delete(packItem);
    await db.delete(pack);
    await db.delete(packGenerationJobEvent);
    await db.delete(packGenerationJob);
    await db.delete(userTermState);
    await db.delete(userStreak);

    revalidatePath("/", "layout");
    return {
      ok: true,
      data: { message: "Successfully cleared all decks, progress, states, and streaks globally." },
    };
  } catch (error) {
    console.error("Failed to clear decks and progress:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    };
  }
}

export async function clearAnalysisStateAction(
  input: ScopedInput,
): Promise<ActionResult<{ message: string }>> {
  try {
    await requireAdmin();

    const { scope, tmdbId, mediaType, seasonNumber } = input;

    if (scope === "media") {
      const contentId = await resolveContentId(tmdbId, mediaType, seasonNumber);

      if (!contentId) {
        return {
          ok: true,
          data: { message: "No database records exist for this media item." },
        };
      }

      // 1. Clear decks, cards, reviews first (satisfies ON DELETE RESTRICT on contentAnalysisItem/vocabularyTerm)
      const packs = await db
        .select({ id: pack.id })
        .from(pack)
        .where(eq(pack.contentId, contentId));
      const packIds = packs.map((p) => p.id);

      if (packIds.length > 0) {
        const packItems = await db
          .select({ id: packItem.id })
          .from(packItem)
          .where(inArray(packItem.packId, packIds));
        const packItemIds = packItems.map((pi) => pi.id);

        if (packItemIds.length > 0) {
          await db.delete(reviewEvent).where(inArray(reviewEvent.packItemId, packItemIds));
          await db.delete(packItemContent).where(inArray(packItemContent.packItemId, packItemIds));
          await db.delete(packItem).where(inArray(packItem.packId, packIds));
        }
        await db.delete(pack).where(eq(pack.contentId, contentId));
      }

      // Delete generation jobs
      const jobs = await db
        .select({ id: packGenerationJob.id })
        .from(packGenerationJob)
        .where(eq(packGenerationJob.contentId, contentId));
      const jobIds = jobs.map((j) => j.id);

      if (jobIds.length > 0) {
        await db
          .delete(packGenerationJobEvent)
          .where(inArray(packGenerationJobEvent.jobId, jobIds));
        await db.delete(packGenerationJob).where(eq(packGenerationJob.contentId, contentId));
      }

      // 2. Clear content analysis items, events, and runs
      const runs = await db
        .select({ id: contentAnalysisRun.id })
        .from(contentAnalysisRun)
        .where(eq(contentAnalysisRun.contentId, contentId));
      const runIds = runs.map((r) => r.id);

      if (runIds.length > 0) {
        await db
          .delete(contentAnalysisItem)
          .where(inArray(contentAnalysisItem.analysisRunId, runIds));
        await db
          .delete(contentAnalysisRunEvent)
          .where(inArray(contentAnalysisRunEvent.runId, runIds));
        await db.delete(contentAnalysisRun).where(eq(contentAnalysisRun.contentId, contentId));
      }

      revalidatePath("/", "layout");
      return {
        ok: true,
        data: { message: "Successfully cleared analysis state and packs for this media." },
      };
    }

    // Global clear
    // Clear decks first
    await db.delete(reviewEvent);
    await db.delete(packItemContent);
    await db.delete(packItem);
    await db.delete(pack);
    await db.delete(packGenerationJobEvent);
    await db.delete(packGenerationJob);
    await db.delete(userTermState);

    // Clear analysis
    await db.delete(contentAnalysisItem);
    await db.delete(contentAnalysisRunEvent);
    await db.delete(contentAnalysisRun);
    await db.delete(vocabularyTerm);

    revalidatePath("/", "layout");
    return {
      ok: true,
      data: { message: "Successfully cleared all content analysis and pack data globally." },
    };
  } catch (error) {
    console.error("Failed to clear analysis state:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    };
  }
}
