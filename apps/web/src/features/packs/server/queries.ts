import "server-only";

import { and, asc, desc, eq, isNull, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type {
  DeckSummary,
  PackCardCounts,
  PackCardState,
  PackCardView,
  PackContentKind,
  PackMediaSummary,
  PackStagingView,
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
  vocabularyTerm,
} from "@/lib/server/db/schema";
import { IMAGE_BASE_URL, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
import { getEffectivePackCardState } from "./srs";

const audioArtifact = alias(artifactObject, "audio_artifact");
const imageArtifact = alias(artifactObject, "image_artifact");

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function buildTmdbImageUrl(path: string | null, size: string) {
  return path ? `${IMAGE_BASE_URL}${size}${path}` : null;
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
  const mediaInfoHref = isMovie
    ? row.tmdbMovieId
      ? `/media/${row.tmdbMovieId}?type=movie`
      : null
    : row.tmdbShowId
      ? `/media/${row.tmdbShowId}?type=tv&season=${row.tmdbSeasonNumber ?? 1}`
      : null;

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
    mediaInfoHref,
  };
}

function artifactUrl(id: string | null | undefined) {
  return id ? `/api/pack-artifacts/${id}` : null;
}

function deriveCounts(cards: Pick<PackCardView, "state">[]): PackCardCounts {
  return cards.reduce<PackCardCounts>(
    (counts, card) => {
      counts[card.state] += 1;
      counts.total += 1;
      return counts;
    },
    { new: 0, learning: 0, due: 0, mastered: 0, total: 0 },
  );
}

function toEffectiveCardView(card: PackCardView, now: Date): PackCardView {
  return {
    ...card,
    state: getEffectivePackCardState({
      state: card.state,
      dueAt: card.dueAt ? new Date(card.dueAt) : null,
      now,
    }) as Exclude<PackCardState, "removed">,
  };
}

function studyQueueRank(state: PackCardView["state"]) {
  return { due: 0, new: 1, learning: 2, mastered: 3 }[state];
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

async function getActivePackCards(packId: string): Promise<PackCardView[]> {
  const now = new Date();
  const rows = await db
    .select({
      item: packItem,
      itemContent: packItemContent,
      term: vocabularyTerm,
      analysis: contentAnalysisItem,
      audioArtifactId: audioArtifact.id,
      imageArtifactId: imageArtifact.id,
    })
    .from(packItem)
    .innerJoin(packItemContent, eq(packItemContent.packItemId, packItem.id))
    .innerJoin(vocabularyTerm, eq(vocabularyTerm.id, packItem.termId))
    .innerJoin(contentAnalysisItem, eq(contentAnalysisItem.id, packItem.contentAnalysisItemId))
    .leftJoin(audioArtifact, eq(audioArtifact.id, packItemContent.audioArtifactId))
    .leftJoin(imageArtifact, eq(imageArtifact.id, packItemContent.imageArtifactId))
    .where(
      and(eq(packItem.packId, packId), ne(packItem.state, "removed"), isNull(packItem.removedAt)),
    )
    .orderBy(asc(packItem.sortOrder));

  return rows.map(({ item, itemContent, term, analysis, audioArtifactId, imageArtifactId }) =>
    toEffectiveCardView(
      {
        id: item.id,
        termId: item.termId,
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
        masteredAt: toIso(item.masteredAt),
        audioUrl: artifactUrl(audioArtifactId),
        imageUrl: artifactUrl(imageArtifactId),
      },
      now,
    ),
  );
}

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

  const cards = await getActivePackCards(packId);

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
    counts: deriveCounts(cards),
    cards,
  };
}

export async function getStudySessionView({
  packId,
  userId,
  initialCardId,
}: {
  packId: string;
  userId: string;
  initialCardId?: string;
}): Promise<StudySessionView | null> {
  const owned = await getOwnedPackRow(packId, userId);
  if (!owned) {
    return null;
  }

  const cards = await getActivePackCards(packId);
  const defaultQueue = cards
    .filter((card) => card.state !== "mastered")
    .toSorted((a, b) => studyQueueRank(a.state) - studyQueueRank(b.state));
  const requestedCard =
    initialCardId && cards.some((card) => card.id === initialCardId)
      ? cards.find((card) => card.id === initialCardId)
      : null;
  const queue = requestedCard
    ? [requestedCard, ...defaultQueue.filter((card) => card.id !== requestedCard.id)]
    : defaultQueue;
  const resolvedInitialCardId =
    initialCardId && queue.some((card) => card.id === initialCardId)
      ? initialCardId
      : (queue[0]?.id ?? null);

  return {
    packId: owned.pack.id,
    packName: owned.pack.name,
    mediaTitle: owned.content.title,
    initialCardId: resolvedInitialCardId,
    cards: queue,
  };
}

export async function getDeckSummariesForUser({
  userId,
}: {
  userId: string;
}): Promise<DeckSummary[]> {
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
    const counts = deriveCounts(
      cards.map((card) => ({
        state: getEffectivePackCardState({
          state: card.state,
          dueAt: card.dueAt,
          now,
          removedAt: card.removedAt,
        }) as PackCardView["state"],
      })),
    );
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
      estimatedStudyMinutes: packRow.estimatedStudyMinutes,
      lastStudiedAt: toIso(lastStudiedAt),
    };
  });
}

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
