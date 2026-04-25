import "server-only";

import { and, desc, eq, gte, isNull, ne } from "drizzle-orm";
import { getEffectivePackCardState } from "@/features/packs/server/srs";
import {
  addUtcDays,
  getAppDateKey,
  getAppDayStartUtc,
  getAppWeekStart,
} from "@/features/packs/server/study-time";
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
  };
  recentPacks: DashboardPackSummary[];
  reviewPlan: {
    dueNow: number;
    dueLaterToday: number;
    dueTomorrow: number;
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
  const todayKey = getAppDateKey(now);
  const tomorrow = getAppDayStartUtc(addUtcDays(todayKey, 1));
  const dayAfterTomorrow = getAppDayStartUtc(addUtcDays(todayKey, 2));

  const [streakRows, knownRows, reviewRows, packRows] = await Promise.all([
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
      .where(eq(pack.userId, userId))
      .orderBy(desc(pack.updatedAt)),
  ]);

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

  let dueNow = 0;
  let dueLaterToday = 0;
  let dueTomorrow = 0;
  const packs = Array.from(grouped.values()).map(
    ({ pack: packRow, content: contentRow, items }) => {
      let masteredCount = 0;
      let dueCount = 0;
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
          dueNow += 1;
        } else if (item.dueAt && item.state !== "new" && item.state !== "mastered") {
          if (item.dueAt < tomorrow) {
            dueLaterToday += 1;
          } else if (item.dueAt < dayAfterTomorrow) {
            dueTomorrow += 1;
          }
        }

        if (item.lastReviewedAt && (!lastStudiedAt || item.lastReviewedAt > lastStudiedAt)) {
          lastStudiedAt = item.lastReviewedAt;
        }
      }

      return {
        id: packRow.id,
        title: contentRow.title,
        kind: (contentRow.kind === "movie" ? "Movie" : "TV") as "Movie" | "TV",
        posterUrl: buildTmdbImageUrl(contentRow.posterPath, TMDB_IMAGE_SIZES.poster.md),
        masteredCount,
        totalCount,
        dueCount,
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
      reviewsDue: dueNow,
      reviewsCompletedThisWeek: reviewRows.length,
      estimatedDueMinutes: Math.max(0, Math.ceil(dueNow * 1.5)),
    },
    recentPacks,
    reviewPlan: {
      dueNow,
      dueLaterToday,
      dueTomorrow,
      focusPacks,
    },
    nextStudyHref: firstDuePack ? `/study/${firstDuePack.id}` : hasPacks ? "/decks" : "/browse",
    nextStudyLabel: firstDuePack ? "Start due reviews" : hasPacks ? "View decks" : "Browse content",
  };
}
