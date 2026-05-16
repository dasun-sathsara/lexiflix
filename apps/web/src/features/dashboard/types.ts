export type PlanTone = "default" | "accent" | "warm" | "danger";

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
