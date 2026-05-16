import { clampToInt, type PlanTone } from "@/features/dashboard/lib/utils";
import type { DashboardView } from "@/features/dashboard/server/queries";

export interface DashboardViewModel {
  displayName: string;
  userLevel: string | null;
  hasPacks: boolean;
  streakDays: number;
  todayLoadPct: number;
  readyNow: number;
  hasWorkNow: boolean;
  heroDescription: string;
  nextStudyHref: string;
  nextStudyLabel: string;
  planItems: { label: string; value: number; tone: PlanTone }[];
  showAssessmentBanner: boolean;
  dashboard: DashboardView;
}

export function buildDashboardViewModel(opts: {
  session: { user: { name: string | null; email: string | null } };
  dashboard: DashboardView;
  userLevel: string | null;
  showAssessmentBanner: boolean;
}): DashboardViewModel {
  const { session, dashboard, userLevel, showAssessmentBanner } = opts;
  const displayName = session.user.name?.trim() || session.user.email?.split("@")[0] || "Learner";
  const hasPacks = dashboard.recentPacks.length > 0;
  const streakDays = dashboard.stats.currentStreakDays;

  const todayLoadPct = clampToInt(
    ((dashboard.reviewPlan.dueNow + dashboard.stats.newCardsCompletedToday) /
      Math.max(
        1,
        dashboard.reviewPlan.dueNow +
          dashboard.reviewPlan.dueLaterToday +
          dashboard.stats.newCardsPerDay,
      )) *
      100,
  );

  const readyNow = dashboard.reviewPlan.dueNow + dashboard.stats.newCardsAvailableToday;
  const hasWorkNow = readyNow > 0;

  const nextStepTime = dashboard.reviewPlan.nextLearningDueAt
    ? new Date(dashboard.reviewPlan.nextLearningDueAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const heroDescription = hasWorkNow
    ? `${readyNow} vocabulary targets primed for retrieval. Approximately ${
        dashboard.stats.estimatedDueMinutes
      } minutes of active training queued${nextStepTime ? `, next step at ${nextStepTime}` : ""}.`
    : "Your vocabulary vault is fully consolidated. Keep the momentum going—explore a new show or film to unlock fresh expressions.";

  const planItems: { label: string; value: number; tone: PlanTone }[] = [
    { label: "Due now", value: dashboard.reviewPlan.dueNow, tone: "danger" },
    { label: "Later today", value: dashboard.reviewPlan.dueLaterToday, tone: "warm" },
    { label: "Tomorrow", value: dashboard.reviewPlan.dueTomorrow, tone: "default" },
    { label: "New available", value: dashboard.stats.newCardsAvailableToday, tone: "accent" },
  ];

  return {
    displayName,
    userLevel,
    hasPacks,
    streakDays,
    todayLoadPct,
    readyNow,
    hasWorkNow,
    heroDescription,
    nextStudyHref: dashboard.nextStudyHref,
    nextStudyLabel: dashboard.nextStudyLabel,
    planItems,
    showAssessmentBanner,
    dashboard,
  };
}
