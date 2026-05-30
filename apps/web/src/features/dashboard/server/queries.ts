import "server-only";

import { and, desc, eq, gte, isNull, ne } from "drizzle-orm";
import { getEffectivePackCardState } from "@/features/packs/server/srs";
import { getStudyPlanForUser } from "@/features/packs/server/study-plan";
import { getAppWeekStart } from "@/features/packs/server/study-time";
import type { PackCardState } from "@/features/packs/types";
import { db } from "@/lib/server/db";
import {
  content,
  pack,
  packItem,
  reviewEvent,
  userStreak,
  userTermState,
} from "@/lib/server/db/schema";
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";

export type DashboardPackSummary = {
  id: string;
  title: string;
  kind: "Movie" | "TV";
  posterUrl: string | null;
  masteredCount: number;
  totalCount: number;
  dueCount: number;
  newAvailableToday: number;
  lastStudiedAt: string | null;
};

export type DashboardFocusPack = {
  id: string;
  title: string;
  due: number;
  total: number;
};

export type DashboardView = {
  stats: {
    currentStreakDays: number;
    totalTermsKnown: number;
    reviewsDue: number;
    reviewsCompletedThisWeek: number;
    estimatedDueMinutes: number;
    newCardsPerDay: number;
    newCardsCompletedToday: number;
    newCardsAvailableToday: number;
  };
  recentPacks: DashboardPackSummary[];
  reviewPlan: {
    dueNow: number;
    dueLaterToday: number;
    dueTomorrow: number;
    nextLearningDueAt: string | null;
    isCompleteForToday: boolean;
    focusPacks: DashboardFocusPack[];
  };
  nextStudyHref: string;
  nextStudyLabel: string;
};

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function getDashboardView({ userId }: { userId: string }): Promise<DashboardView> {
  const now = new Date();
  const weekStart = getAppWeekStart(now);

  const [studyPlan, streakRows, knownRows, reviewRows, packRows] = await Promise.all([
    getStudyPlanForUser({ userId, now }),
    db.select().from(userStreak).where(eq(userStreak.userId, userId)).limit(1),
    db
      .select({ termId: userTermState.termId })
      .from(userTermState)
      .where(and(eq(userTermState.userId, userId), eq(userTermState.state, "known"))),
    db
      .select({ id: reviewEvent.id })
      .from(reviewEvent)
      .where(and(eq(reviewEvent.userId, userId), gte(reviewEvent.reviewedAt, weekStart))),
    db
      .select({
        pack,
        content,
        item: packItem,
      })
      .from(pack)
      .innerJoin(content, eq(pack.contentId, content.id))
      .leftJoin(
        packItem,
        and(
          eq(packItem.packId, pack.id),
          ne(packItem.state, "removed"),
          isNull(packItem.removedAt),
        ),
      )
      .where(and(eq(pack.userId, userId), eq(pack.status, "active")))
      .orderBy(desc(pack.updatedAt)),
  ]);
  const planByPackId = new Map(studyPlan.packs.map((packPlan) => [packPlan.packId, packPlan]));

  const grouped = new Map<
    string,
    {
      pack: typeof pack.$inferSelect;
      content: typeof content.$inferSelect;
      items: (typeof packItem.$inferSelect)[];
    }
  >();

  for (const row of packRows) {
    const current = grouped.get(row.pack.id) ?? {
      pack: row.pack,
      content: row.content,
      items: [],
    };
    if (row.item) {
      current.items.push(row.item);
    }
    grouped.set(row.pack.id, current);
  }

  const packs = Array.from(grouped.values()).map(
    ({ pack: packRow, content: contentRow, items }) => {
      let masteredCount = 0;
      let dueCount = 0;
      let newAvailableToday = 0;
      let totalCount = 0;
      let lastStudiedAt: Date | null = null;

      for (const item of items) {
        const effectiveState = getEffectivePackCardState({
          state: item.state as PackCardState,
          dueAt: item.dueAt,
          now,
          removedAt: item.removedAt,
        });
        totalCount += 1;

        if (effectiveState === "mastered") {
          masteredCount += 1;
        }

        if (effectiveState === "due") {
          dueCount += 1;
        }

        if (item.lastReviewedAt && (!lastStudiedAt || item.lastReviewedAt > lastStudiedAt)) {
          lastStudiedAt = item.lastReviewedAt;
        }
      }
      const packPlan = planByPackId.get(packRow.id);
      dueCount = packPlan?.dueCount ?? dueCount;
      newAvailableToday = packPlan?.newAvailableToday ?? 0;

      return {
        id: packRow.id,
        title: contentRow.title,
        kind: (contentRow.kind === "movie" ? "Movie" : "TV") as "Movie" | "TV",
        posterUrl: buildTmdbImageUrl(contentRow.posterPath, TMDB_IMAGE_SIZES.poster.md),
        masteredCount,
        totalCount,
        dueCount,
        newAvailableToday,
        lastStudiedAt: toIso(lastStudiedAt),
        updatedAt: packRow.updatedAt,
      };
    },
  );

  const recentPacks = packs
    .toSorted((a, b) => {
      const aTime = a.lastStudiedAt ? new Date(a.lastStudiedAt).getTime() : a.updatedAt.getTime();
      const bTime = b.lastStudiedAt ? new Date(b.lastStudiedAt).getTime() : b.updatedAt.getTime();
      return bTime - aTime;
    })
    .slice(0, 3)
    .map(({ updatedAt: _updatedAt, ...packSummary }) => packSummary);
  const focusPacks = packs
    .filter((packSummary) => packSummary.dueCount > 0)
    .toSorted((a, b) => b.dueCount - a.dueCount)
    .slice(0, 3)
    .map((packSummary) => ({
      id: packSummary.id,
      title: packSummary.title,
      due: packSummary.dueCount,
      total: packSummary.totalCount,
    }));
  const firstDuePack = focusPacks[0];
  const hasPacks = packs.length > 0;

  return {
    stats: {
      currentStreakDays: streakRows[0]?.currentStreakDays ?? 0,
      totalTermsKnown: knownRows.length,
      reviewsDue: studyPlan.dueNow,
      reviewsCompletedThisWeek: reviewRows.length,
      estimatedDueMinutes: Math.max(0, Math.ceil(studyPlan.dueNow * 1.5)),
      newCardsPerDay: studyPlan.newCardsPerDay,
      newCardsCompletedToday: studyPlan.newCardsCompletedToday,
      newCardsAvailableToday: studyPlan.newAvailableToday,
    },
    recentPacks,
    reviewPlan: {
      dueNow: studyPlan.dueNow,
      dueLaterToday: studyPlan.dueLaterToday,
      dueTomorrow: studyPlan.dueTomorrow,
      nextLearningDueAt: studyPlan.nextLearningDueAt,
      isCompleteForToday: studyPlan.isCompleteForToday,
      focusPacks,
    },
    nextStudyHref: firstDuePack
      ? `/study/${firstDuePack.id}?mode=due`
      : studyPlan.newAvailableToday > 0
        ? "/decks"
        : hasPacks
          ? "/decks"
          : "/browse",
    nextStudyLabel: firstDuePack
      ? "Start due reviews"
      : studyPlan.newAvailableToday > 0
        ? "Learn new"
        : hasPacks
          ? "View decks"
          : "Browse content",
  };
}
