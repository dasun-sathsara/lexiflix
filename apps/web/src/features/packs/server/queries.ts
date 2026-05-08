import "server-only";

import { and, asc, desc, eq, isNull, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { buildContentMediaHref } from "@/features/media/lib/content-media";
import type {
  DeckSummary,
  PackCardCounts,
  PackCardState,
  PackCardView,
  PackContentKind,
  PackMediaSummary,
  PackStagingView,
  StudyMode,
  StudySessionView,
} from "@/features/packs/types";
import { db } from "@/lib/server/db";
import {
  artifactObject,
  content,
  contentAnalysisItem,
  pack,
  packItem,
  packItemContent,
  userTermState,
  vocabularyTerm,
} from "@/lib/server/db/schema";
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
import { getEffectivePackCardState, getRatingIntervalPreviews } from "./srs";
import { buildStudyQueue, getPackStudyPlan, getStudyPlanForUser } from "./study-plan";

const audioArtifact = alias(artifactObject, "audio_artifact");
const imageArtifact = alias(artifactObject, "image_artifact");

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function releaseYear(value: Date | null) {
  return value ? value.getFullYear() : null;
}

function buildMediaSummary(row: typeof content.$inferSelect): PackMediaSummary {
  const isMovie = row.kind === "movie";
  const subtitle = isMovie
    ? null
    : row.tmdbSeasonNumber
      ? `Season ${row.tmdbSeasonNumber}`
      : "Season";
  return {
    id: row.id,
    kind: row.kind as PackContentKind,
    title: row.title,
    subtitle,
    tmdbMovieId: row.tmdbMovieId,
    tmdbShowId: row.tmdbShowId,
    tmdbSeasonNumber: row.tmdbSeasonNumber,
    releaseYear: releaseYear(row.releaseDate ?? row.firstAirDate),
    posterUrl: buildTmdbImageUrl(row.posterPath, TMDB_IMAGE_SIZES.poster.md),
    backdropUrl: buildTmdbImageUrl(row.backdropPath, TMDB_IMAGE_SIZES.backdrop.lg),
    mediaInfoHref: buildContentMediaHref(row, { fallbackSeasonNumber: 1 }),
  };
}

function artifactUrl(id: string | null | undefined) {
  return id ? `/api/pack-artifacts/${id}` : null;
}

function deriveCounts(cards: Pick<PackCardView, "state">[]): PackCardCounts {
  return cards.reduce<PackCardCounts>(
    (counts, card) => {
      if (card.state === "removed") {
        counts.hidden += 1;
        return counts;
      }
      counts[card.state] += 1;
      counts.total += 1;
      return counts;
    },
    {
      new: 0,
      learning: 0,
      due: 0,
      mastered: 0,
      futureLearning: 0,
      hidden: 0,
      total: 0,
    },
  );
}

function toEffectiveCardView(card: PackCardView, now: Date): PackCardView {
  const previousState =
    card.state === "mastered" ? "mastered" : card.state === "new" ? "new" : "learning";
  return {
    ...card,
    state: getEffectivePackCardState({
      state: card.state,
      dueAt: card.dueAt ? new Date(card.dueAt) : null,
      now,
    }) as PackCardState,
    ratingPreviews: getRatingIntervalPreviews({
      reviewedAt: now,
      previousState,
      previousRating: card.lastRating,
      repetitionCount: card.repetitionCount,
      lapseCount: card.lapseCount,
      intervalDays: card.intervalDays,
      easeFactor: card.easeFactor,
    }),
  };
}

async function getOwnedPackRow(packId: string, userId: string) {
  const rows = await db
    .select({ pack, content })
    .from(pack)
    .innerJoin(content, eq(pack.contentId, content.id))
    .where(and(eq(pack.id, packId), eq(pack.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

async function getPackCards(packId: string, userId: string): Promise<PackCardView[]> {
  const now = new Date();
  const rows = await db
    .select({
      item: packItem,
      itemContent: packItemContent,
      term: vocabularyTerm,
      analysis: contentAnalysisItem,
      audioArtifactId: audioArtifact.id,
      imageArtifactId: imageArtifact.id,
      termState: userTermState.state,
    })
    .from(packItem)
    .innerJoin(packItemContent, eq(packItemContent.packItemId, packItem.id))
    .innerJoin(vocabularyTerm, eq(vocabularyTerm.id, packItem.termId))
    .innerJoin(contentAnalysisItem, eq(contentAnalysisItem.id, packItem.contentAnalysisItemId))
    .leftJoin(audioArtifact, eq(audioArtifact.id, packItemContent.audioArtifactId))
    .leftJoin(imageArtifact, eq(imageArtifact.id, packItemContent.imageArtifactId))
    .leftJoin(
      userTermState,
      and(eq(userTermState.userId, userId), eq(userTermState.termId, packItem.termId)),
    )
    .where(eq(packItem.packId, packId))
    .orderBy(asc(packItem.sortOrder));

  return rows.map(
    ({ item, itemContent, term, analysis, audioArtifactId, imageArtifactId, termState }) =>
      toEffectiveCardView(
        {
          id: item.id,
          termId: item.termId,
          termState,
          displayText: term.displayText,
          kind: term.kind,
          partOfSpeech: term.partOfSpeech,
          cefrLevel: analysis.cefrLevel ?? term.baseCefrLevel,
          meaning: itemContent.meaning,
          exampleSentences: itemContent.exampleSentences ?? [],
          occurrenceCount: analysis.occurrenceCount,
          frequencyRank: analysis.frequencyRank,
          includedReason: item.includedReason,
          state: item.state as PackCardView["state"],
          dueAt: toIso(item.dueAt),
          lastReviewedAt: toIso(item.lastReviewedAt),
          lastRating: item.lastRating,
          repetitionCount: item.repetitionCount,
          lapseCount: item.lapseCount,
          intervalDays: item.intervalDays,
          easeFactor: item.easeFactor,
          masteredAt: toIso(item.masteredAt),
          ratingPreviews: { again: "", hard: "", good: "", easy: "" },
          audioUrl: artifactUrl(audioArtifactId),
          imageUrl: artifactUrl(imageArtifactId),
        },
        now,
      ),
  );
}

/**
 * Builds the staging view data for a specific pack, including its items, media context,
 * and user-specific state like global ignored terms.
 */
export async function getPackStagingView({
  packId,
  userId,
}: {
  packId: string;
  userId: string;
}): Promise<PackStagingView | null> {
  const owned = await getOwnedPackRow(packId, userId);
  if (!owned) {
    return null;
  }

  const cards = await getPackCards(packId, userId);
  const studyPlan = await getPackStudyPlan({ packId, userId });
  const counts = deriveCounts(cards);
  counts.futureLearning = studyPlan.futureLearningCount;
  counts.hidden = studyPlan.hiddenCount;

  return {
    id: owned.pack.id,
    name: owned.pack.name,
    status: owned.pack.status,
    createdAt: owned.pack.createdAt.toISOString(),
    updatedAt: owned.pack.updatedAt.toISOString(),
    media: buildMediaSummary(owned.content),
    learnerCefrLevelAtGeneration: owned.pack.learnerCefrLevelAtGeneration,
    selectedVocabularyTypes: owned.pack.selectedVocabularyTypes,
    estimatedStudyMinutes: owned.pack.estimatedStudyMinutes,
    sourceJobId: owned.pack.sourceJobId,
    counts,
    studyPlan,
    cards,
  };
}

/**
 * Constructs the view model for a study session, determining the active queue of cards
 * (e.g., due for review, learning new) based on the user's selected study mode.
 */
export async function getStudySessionView({
  packId,
  userId,
  initialCardId,
  mode = "due",
}: {
  packId: string;
  userId: string;
  initialCardId?: string;
  mode?: StudyMode;
}): Promise<StudySessionView | null> {
  const owned = await getOwnedPackRow(packId, userId);
  if (!owned) {
    return null;
  }

  const cards = await getPackCards(packId, userId);
  const studyPlan = await getPackStudyPlan({ packId, userId });
  const resolvedMode = initialCardId
    ? "preview"
    : mode === "new" && studyPlan.dueCount > 0
      ? "due"
      : mode;
  const queue = buildStudyQueue({
    cards,
    mode: resolvedMode,
    newCardLimit: studyPlan.newAvailableToday,
    requestedCardId: initialCardId,
  });
  const resolvedInitialCardId =
    initialCardId && queue.some((card) => card.id === initialCardId)
      ? initialCardId
      : (queue[0]?.id ?? null);

  return {
    packId: owned.pack.id,
    packName: owned.pack.name,
    mediaTitle: owned.content.title,
    mode: resolvedMode,
    newCardsRemainingToday: studyPlan.newAvailableToday,
    nextNewHref:
      resolvedMode === "due" && studyPlan.dueCount === 0 && studyPlan.newAvailableToday > 0
        ? `/study/${owned.pack.id}?mode=new`
        : null,
    initialCardId: resolvedInitialCardId,
    cards: queue,
  };
}

/**
 * Fetches and aggregates all pack summaries for a user to display in their deck library.
 * Computes study statistics, due counts, and overall progress per pack.
 */
export async function getDeckSummariesForUser({
  userId,
}: {
  userId: string;
}): Promise<DeckSummary[]> {
  const userStudyPlan = await getStudyPlanForUser({ userId });
  const planByPackId = new Map(
    userStudyPlan.packs.map((studyPlan) => [studyPlan.packId, studyPlan]),
  );
  const rows = await db
    .select({
      pack,
      content,
      item: packItem,
    })
    .from(pack)
    .innerJoin(content, eq(pack.contentId, content.id))
    .leftJoin(
      packItem,
      and(eq(packItem.packId, pack.id), ne(packItem.state, "removed"), isNull(packItem.removedAt)),
    )
    .where(eq(pack.userId, userId))
    .orderBy(desc(pack.updatedAt), asc(packItem.sortOrder));

  const grouped = new Map<
    string,
    {
      pack: typeof pack.$inferSelect;
      content: typeof content.$inferSelect;
      cards: (typeof packItem.$inferSelect)[];
    }
  >();

  for (const row of rows) {
    const current = grouped.get(row.pack.id) ?? {
      pack: row.pack,
      content: row.content,
      cards: [],
    };
    if (row.item) {
      current.cards.push(row.item);
    }
    grouped.set(row.pack.id, current);
  }

  return Array.from(grouped.values()).map(({ pack: packRow, content: contentRow, cards }) => {
    const media = buildMediaSummary(contentRow);
    const now = new Date();
    const studyPlan = planByPackId.get(packRow.id) ?? {
      packId: packRow.id,
      dueCount: 0,
      newAvailableToday: 0,
      newTotal: 0,
      futureLearningCount: 0,
      masteredCount: 0,
      hiddenCount: 0,
      nextLearningDueAt: null,
      recommendedMode: null,
    };
    const counts = deriveCounts(
      cards.map((card) => ({
        state: getEffectivePackCardState({
          state: card.state,
          dueAt: card.dueAt,
          now,
          removedAt: card.removedAt,
        }) as PackCardState,
      })),
    );
    counts.new = studyPlan.newAvailableToday;
    counts.futureLearning = studyPlan.futureLearningCount;
    counts.hidden = studyPlan.hiddenCount;
    const lastStudiedAt = cards
      .map((card) => card.lastReviewedAt)
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      id: packRow.id,
      title: media.title,
      subtitle: media.subtitle,
      mediaType: media.kind === "movie" ? "movie" : "tv",
      posterUrl: media.posterUrl,
      counts,
      studyPlan,
      estimatedStudyMinutes: packRow.estimatedStudyMinutes,
      lastStudiedAt: toIso(lastStudiedAt),
    };
  });
}

/**
 * Retrieves a generated pack artifact from storage, ensuring the requesting user
 * actually owns the pack associated with the artifact.
 */
export async function getOwnedArtifactObject({
  artifactId,
  userId,
}: {
  artifactId: string;
  userId: string;
}) {
  const rows = await db
    .select({ artifact: artifactObject })
    .from(artifactObject)
    .innerJoin(
      packItemContent,
      or(
        eq(packItemContent.audioArtifactId, artifactObject.id),
        eq(packItemContent.imageArtifactId, artifactObject.id),
      ),
    )
    .innerJoin(packItem, eq(packItem.id, packItemContent.packItemId))
    .innerJoin(pack, eq(pack.id, packItem.packId))
    .where(and(eq(artifactObject.id, artifactId), eq(pack.userId, userId)))
    .limit(1);

  return rows[0]?.artifact ?? null;
}
