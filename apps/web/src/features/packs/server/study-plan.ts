import "server-only";

import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import type { PackCardView, PackStudyPlan, StudyMode, UserStudyPlan } from "@/features/packs/types";
import { settingsPreferenceDefaults } from "@/features/settings/server/preferences";
import { db } from "@/lib/server/db";
import { pack, packItem, userPreferences } from "@/lib/server/db/schema";
import { addUtcDays, getAppDateKey, getAppDayStartUtc } from "./study-time";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function emptyPackPlan(packId: string): PackStudyPlan {
  return {
    packId,
    dueCount: 0,
    newAvailableToday: 0,
    newTotal: 0,
    futureLearningCount: 0,
    masteredCount: 0,
    hiddenCount: 0,
    nextLearningDueAt: null,
    recommendedMode: null,
  };
}

function finalizePackPlan(plan: PackStudyPlan): PackStudyPlan {
  return {
    ...plan,
    recommendedMode: plan.dueCount > 0 ? "due" : plan.newAvailableToday > 0 ? "new" : null,
  };
}

async function getNewCardAllowance(userId: string, now: Date) {
  const todayKey = getAppDateKey(now);
  const todayStart = getAppDayStartUtc(todayKey);
  const tomorrowStart = getAppDayStartUtc(addUtcDays(todayKey, 1));
  const [preferenceRows, completedRows] = await Promise.all([
    db
      .select({ newCardsPerDay: userPreferences.newCardsPerDay })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1),
    db
      .select({ id: packItem.id })
      .from(packItem)
      .innerJoin(pack, eq(pack.id, packItem.packId))
      .where(
        and(
          eq(pack.userId, userId),
          gte(packItem.firstStudiedAt, todayStart),
          lt(packItem.firstStudiedAt, tomorrowStart),
        ),
      ),
  ]);

  const newCardsPerDay =
    preferenceRows[0]?.newCardsPerDay ?? settingsPreferenceDefaults.newCardsPerDay;
  const newCardsCompletedToday = completedRows.length;

  return {
    newCardsPerDay,
    newCardsCompletedToday,
    newCardsRemainingToday: Math.max(0, newCardsPerDay - newCardsCompletedToday),
    todayKey,
    tomorrowStart,
    dayAfterTomorrowStart: getAppDayStartUtc(addUtcDays(todayKey, 2)),
  };
}

export async function getStudyPlanForUser({
  userId,
  now = new Date(),
}: {
  userId: string;
  now?: Date;
}): Promise<UserStudyPlan> {
  const allowance = await getNewCardAllowance(userId, now);
  const rows = await db
    .select({
      packId: pack.id,
      updatedAt: pack.updatedAt,
      item: packItem,
    })
    .from(pack)
    .leftJoin(packItem, eq(packItem.packId, pack.id))
    .where(and(eq(pack.userId, userId), eq(pack.status, "active")))
    .orderBy(desc(pack.updatedAt), asc(packItem.sortOrder));

  const packOrder = new Map<string, Date>();
  const plans = new Map<string, PackStudyPlan>();
  let dueNow = 0;
  let dueLaterToday = 0;
  let dueTomorrow = 0;
  let newTotal = 0;
  let nextLearningDueAt: Date | null = null;

  for (const row of rows) {
    packOrder.set(row.packId, row.updatedAt);
    const plan = plans.get(row.packId) ?? emptyPackPlan(row.packId);
    const item = row.item;

    if (!item) {
      plans.set(row.packId, plan);
      continue;
    }

    if (item.state === "removed" || item.removedAt) {
      plan.hiddenCount += 1;
      plans.set(row.packId, plan);
      continue;
    }

    if (item.state === "mastered") {
      plan.masteredCount += 1;
    } else if (item.state === "new") {
      plan.newTotal += 1;
      newTotal += 1;
    } else if (item.dueAt && item.dueAt.getTime() <= now.getTime()) {
      plan.dueCount += 1;
      dueNow += 1;
    } else if (item.dueAt) {
      plan.futureLearningCount += 1;
      if (item.dueAt < allowance.tomorrowStart) {
        dueLaterToday += 1;
      } else if (item.dueAt < allowance.dayAfterTomorrowStart) {
        dueTomorrow += 1;
      }
      if (!nextLearningDueAt || item.dueAt < nextLearningDueAt) {
        nextLearningDueAt = item.dueAt;
      }
      if (
        !plan.nextLearningDueAt ||
        item.dueAt.getTime() < new Date(plan.nextLearningDueAt).getTime()
      ) {
        plan.nextLearningDueAt = item.dueAt.toISOString();
      }
    }

    plans.set(row.packId, plan);
  }

  let remaining = allowance.newCardsRemainingToday;
  const packPlans = Array.from(plans.values())
    .toSorted((a, b) => {
      const aTime = packOrder.get(a.packId)?.getTime() ?? 0;
      const bTime = packOrder.get(b.packId)?.getTime() ?? 0;
      return bTime - aTime;
    })
    .map((plan) => {
      const newAvailableToday = Math.min(plan.newTotal, remaining);
      remaining -= newAvailableToday;
      return finalizePackPlan({ ...plan, newAvailableToday });
    });

  return {
    newCardsPerDay: allowance.newCardsPerDay,
    newCardsCompletedToday: allowance.newCardsCompletedToday,
    newCardsRemainingToday: allowance.newCardsRemainingToday,
    dueNow,
    dueLaterToday,
    dueTomorrow,
    newAvailableToday: Math.min(newTotal, allowance.newCardsRemainingToday),
    nextLearningDueAt: toIso(nextLearningDueAt),
    isCompleteForToday: dueNow === 0 && Math.min(newTotal, allowance.newCardsRemainingToday) === 0,
    packs: packPlans,
  };
}

export async function getPackStudyPlan({
  packId,
  userId,
  now = new Date(),
}: {
  packId: string;
  userId: string;
  now?: Date;
}): Promise<PackStudyPlan> {
  const userPlan = await getStudyPlanForUser({ userId, now });
  return userPlan.packs.find((plan) => plan.packId === packId) ?? emptyPackPlan(packId);
}

export function buildStudyQueue({
  cards,
  mode,
  newCardLimit,
  requestedCardId,
}: {
  cards: PackCardView[];
  mode: StudyMode;
  newCardLimit: number;
  requestedCardId?: string | null;
}) {
  const activeCards = cards.filter((card) => card.state !== "mastered" && card.state !== "removed");
  const requestedCard = requestedCardId
    ? activeCards.find((card) => card.id === requestedCardId)
    : null;

  if (mode === "preview") {
    return requestedCard ? [requestedCard] : [];
  }

  if (mode === "cram") {
    return requestedCard
      ? [requestedCard, ...activeCards.filter((card) => card.id !== requestedCard.id)]
      : activeCards;
  }

  const queue =
    mode === "new"
      ? activeCards.filter((card) => card.state === "new").slice(0, Math.max(0, newCardLimit))
      : activeCards.filter((card) => card.state === "due");

  return requestedCard && !queue.some((card) => card.id === requestedCard.id)
    ? [requestedCard, ...queue]
    : queue;
}
