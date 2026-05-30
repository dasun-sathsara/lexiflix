import {
  BookOpen,
  CalendarClock,
  ChevronRight,
  Flame,
  GraduationCap,
  Layers,
  Play,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AppPageShell } from "@/components/common/app-page-shell";
import { AppEmptyState, AppStat } from "@/components/common/app-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { shouldShowAssessmentBanner } from "@/features/assessment/server/profile";
import { getDashboardView } from "@/features/dashboard/server/queries";
import { reconcileDueReviewNotificationForUser } from "@/features/notifications/server/queries";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireSession } from "@/lib/auth-guards";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampToInt(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

type PlanTone = "default" | "accent" | "warm" | "danger";

const planToneDot: Record<PlanTone, string> = {
  default: "bg-muted-foreground/45",
  accent: "bg-blue-500",
  warm: "bg-amber-500",
  danger: "bg-rose-500",
};

// ---------------------------------------------------------------------------
// LoadRing — signature visual for the hero
// ---------------------------------------------------------------------------

function LoadRing({ value, className }: { value: number; className?: string }) {
  const size = 168;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (value / 100) * circumference;

  return (
    <div
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="-rotate-90"
      >
        <defs>
          <linearGradient id="dashboardLoadRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted/60 dark:stroke-muted/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke="url(#dashboardLoadRing)"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[2.25rem] font-semibold leading-none tabular-nums tracking-tight">
          {value}
          <span className="ml-0.5 text-lg text-muted-foreground">%</span>
        </span>
        <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Today's Load
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const session = await requireSession();
  const [showAssessmentBanner, dashboard] = await Promise.all([
    shouldShowAssessmentBanner(session.user.id),
    getDashboardView({ userId: session.user.id }),
    reconcileDueReviewNotificationForUser({ userId: session.user.id }),
  ]);

  const displayName = session.user.name?.trim() || session.user.email?.split("@")[0] || "Learner";
  const hasPacks = dashboard.recentPacks.length > 0;
  const streakDays = dashboard.stats.currentStreakDays;

  // Preserved from original.
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
    ? `${readyNow} card${readyNow === 1 ? "" : "s"} ready. About ${
        dashboard.stats.estimatedDueMinutes
      } min of reviews queued${nextStepTime ? `, next step at ${nextStepTime}` : ""}.`
    : "You're caught up for now. Come back after the next scheduled step, or learn something new.";

  const planItems: { label: string; value: number; tone: PlanTone }[] = [
    { label: "Due now", value: dashboard.reviewPlan.dueNow, tone: "danger" },
    { label: "Later today", value: dashboard.reviewPlan.dueLaterToday, tone: "warm" },
    { label: "Tomorrow", value: dashboard.reviewPlan.dueTomorrow, tone: "default" },
    { label: "New available", value: dashboard.stats.newCardsAvailableToday, tone: "accent" },
  ];

  return (
    <>
      <AppTopbar title="Dashboard" />
      <AppPageShell className="gap-5">
        {/* Hero ------------------------------------------------------------- */}
        <section
          aria-label="Today's overview"
          className="relative overflow-hidden rounded-[calc(var(--radius)+2px)] border border-border/80 bg-card/70 shadow-sm"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div
              className="absolute -right-24 -top-28 size-[360px] rounded-full blur-3xl"
              style={{ background: "color-mix(in oklab, var(--primary) 8%, transparent)" }}
            />
            <div
              className="absolute -bottom-24 -left-20 size-[300px] rounded-full blur-3xl"
              style={{ background: "color-mix(in oklab, var(--primary) 7%, transparent)" }}
            />
          </div>

          <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10">
            <div className="flex min-w-0 flex-col gap-4">
              {/* Chip row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/80 px-2.5 py-1 text-[11px] font-medium tracking-[0.02em] text-muted-foreground shadow-xs backdrop-blur-sm">
                  <CalendarClock className="size-3" />
                  Today
                </span>
                {streakDays > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 shadow-xs dark:border-amber-500/30 dark:text-amber-300">
                    <Flame className="size-3" />
                    {streakDays}-day streak
                  </span>
                ) : null}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-xs",
                    hasWorkNow
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-emerald-200/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300",
                  )}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {hasWorkNow ? `${readyNow} ready` : "All clear"}
                </span>
              </div>

              {/* Heading */}
              <div className="space-y-1.5">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Welcome back, <span className="text-primary">{displayName}</span>
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  {heroDescription}
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" asChild>
                  <Link href={dashboard.nextStudyHref}>
                    <Play className="size-4" />
                    {dashboard.nextStudyLabel}
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/browse">Browse</Link>
                </Button>
              </div>
            </div>

            <LoadRing value={todayLoadPct} className="mx-auto lg:mx-0" />
          </div>

          {/* Plan strip — transparent cells so the hero wash continues through */}
          <div className="relative grid grid-cols-2 border-t border-border/70 sm:grid-cols-4">
            {planItems.map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  "flex flex-col gap-1 p-4 sm:p-5",
                  // Mobile 2×2 dividers
                  index % 2 === 1 && "border-l border-border/70",
                  index >= 2 && "border-t border-border/70",
                  // Desktop 1×4: promote to a single row
                  index >= 2 && "sm:border-t-0",
                  index > 0 && "sm:border-l sm:border-border/70",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", planToneDot[item.tone])} />
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {item.label}
                  </span>
                </div>
                <span className="text-2xl font-semibold leading-none tabular-nums tracking-tight">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Assessment banner ----------------------------------------------- */}
        {showAssessmentBanner ? (
          <Card className="border-amber-200/70 py-0 shadow-sm dark:border-amber-500/30">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-amber-200/70 bg-amber-500/10 text-amber-600 dark:border-amber-500/30 dark:text-amber-300">
                  <GraduationCap className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">Discover Your Level</h3>
                  <p className="text-sm text-muted-foreground">
                    Take the assessment to tune future pack generation.
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href="/onboarding/assessment">
                  Start Assessment
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Secondary stats -------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <AppStat
            variant="card"
            label="Terms Known"
            value={`${dashboard.stats.totalTermsKnown}`}
            icon={BookOpen}
            hint="Across all packs"
            tone="accent"
          />
          <AppStat
            variant="card"
            label="Reviews This Week"
            value={`${dashboard.stats.reviewsCompletedThisWeek}`}
            icon={TrendingUp}
            hint="From review history"
            tone="success"
          />
          <AppStat
            variant="card"
            label="New Done Today"
            value={`${dashboard.stats.newCardsCompletedToday} / ${dashboard.stats.newCardsPerDay}`}
            icon={Sparkles}
            hint="Daily new-card goal"
            tone="warm"
          />
        </div>

        {/* Content grid ----------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {/* Jump Back In */}
          <Card className="shadow-sm lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Jump Back In</CardTitle>
                  <CardDescription>Recent packs and mastery progress.</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/decks">
                    View Decks
                    <ChevronRight className="size-4 opacity-70" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {hasPacks ? (
                dashboard.recentPacks.map((pack) => {
                  const progressPct = clampToInt(
                    (pack.masteredCount / Math.max(1, pack.totalCount)) * 100,
                  );
                  const href = pack.dueCount > 0 ? `/study/${pack.id}` : `/pack/${pack.id}`;
                  const action =
                    pack.dueCount > 0
                      ? "Review"
                      : pack.newAvailableToday > 0
                        ? "Learn New"
                        : "Open";
                  const statusText =
                    pack.dueCount > 0
                      ? `${pack.dueCount} due${
                          pack.newAvailableToday > 0 ? `, ${pack.newAvailableToday} new today` : ""
                        }`
                      : pack.newAvailableToday > 0
                        ? `${pack.newAvailableToday} new today`
                        : "No due reviews";
                  const hasAction = pack.dueCount > 0 || pack.newAvailableToday > 0;

                  return (
                    <Link
                      key={pack.id}
                      href={href}
                      className="group relative block overflow-hidden rounded-xl border border-border/80 bg-card/60 p-3 transition-[border-color,background-color] duration-200 ease-out hover:border-primary/30 hover:bg-card"
                    >
                      {hasAction ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b",
                            pack.dueCount > 0
                              ? "from-rose-500/75 to-rose-500/30"
                              : "from-primary/75 to-primary/30",
                          )}
                        />
                      ) : null}
                      <div className="flex gap-3 pl-2">
                        <div className="relative h-[88px] w-[60px] shrink-0 overflow-hidden rounded-lg border bg-muted shadow-xs">
                          {pack.posterUrl ? (
                            <Image
                              src={pack.posterUrl}
                              alt={pack.title}
                              fill
                              sizes="60px"
                              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-muted-foreground">
                              <Layers className="size-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="truncate text-[15px] font-semibold tracking-tight">
                                {pack.title}
                              </p>
                              <div className="flex min-w-0 items-center gap-2">
                                <Badge variant="secondary">{pack.kind}</Badge>
                                <span className="truncate text-xs text-muted-foreground">
                                  {statusText}
                                </span>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="shrink-0" asChild>
                              <span>{action}</span>
                            </Button>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Mastered</span>
                              <span className="font-medium tabular-nums text-foreground">
                                {pack.masteredCount}/{pack.totalCount}
                              </span>
                            </div>
                            <Progress value={progressPct} className="h-1.5" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <AppEmptyState
                  icon={Layers}
                  title="No packs yet"
                  description="Browse content to generate your first vocabulary pack."
                  className="border-dashed shadow-none"
                  action={
                    <Button size="sm" asChild>
                      <Link href="/browse">Browse Content</Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>

          {/* Needs Attention */}
          <Card className="shadow-sm lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Needs Attention</CardTitle>
                  <CardDescription>Packs with overdue reviews.</CardDescription>
                </div>
                <Badge variant="secondary">
                  {dashboard.reviewPlan.focusPacks.length > 0
                    ? `${dashboard.reviewPlan.focusPacks.length} focus`
                    : "Clear"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {dashboard.reviewPlan.focusPacks.length > 0 ? (
                dashboard.reviewPlan.focusPacks.map((pack) => (
                  <Link
                    key={pack.id}
                    href={`/study/${pack.id}`}
                    className="group relative block overflow-hidden rounded-xl border border-border/80 bg-card/60 p-3 transition-colors duration-200 ease-out hover:border-primary/30 hover:bg-card"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-rose-500/75 to-rose-500/30"
                    />
                    <div className="pl-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-sm font-medium">{pack.title}</span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rose-200/50 bg-rose-500/10 px-1.5 py-0.5 text-xs font-medium text-rose-600 dark:border-rose-500/30 dark:text-rose-400">
                          <span className="tabular-nums">{pack.due}</span>
                          <span className="opacity-75">due</span>
                        </span>
                      </div>
                      <Progress
                        value={clampToInt((pack.due / Math.max(1, pack.total)) * 100)}
                        className="mt-2 h-1.5"
                      />
                    </div>
                  </Link>
                ))
              ) : (
                <AppEmptyState
                  icon={Play}
                  title="No due reviews"
                  description={
                    hasPacks
                      ? "You're caught up. Open decks to learn new cards or wait for the next scheduled step."
                      : "Generate a pack to start building a review queue."
                  }
                  className="border-dashed shadow-none"
                  action={
                    <Button size="sm" variant="outline" asChild>
                      <Link href={hasPacks ? "/decks" : "/browse"}>
                        {hasPacks ? "View Decks" : "Browse Content"}
                      </Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>
      </AppPageShell>
    </>
  );
}
