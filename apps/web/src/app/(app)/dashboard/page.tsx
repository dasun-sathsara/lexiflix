import {
  BookOpen,
  ChevronRight,
  Clock3,
  Flame,
  GraduationCap,
  Layers,
  Play,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { AppEmptyState, AppPanel, AppStat } from "@/components/common/app-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { shouldShowAssessmentBanner } from "@/features/assessment/server/profile";
import { getDashboardView } from "@/features/dashboard/server/queries";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireSession } from "@/lib/auth-guards";

function clampToInt(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default async function DashboardPage() {
  const session = await requireSession();
  const [showAssessmentBanner, dashboard] = await Promise.all([
    shouldShowAssessmentBanner(session.user.id),
    getDashboardView({ userId: session.user.id }),
  ]);
  const displayName = session.user.name?.trim() || session.user.email?.split("@")[0] || "Learner";
  const hasPacks = dashboard.recentPacks.length > 0;
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

  return (
    <>
      <AppTopbar title="Dashboard" />
      <AppPageShell>
        <AppPageHeader
          eyebrow={<Badge variant="secondary">Dashboard</Badge>}
          heading={
            <>
              Welcome back, <span className="text-primary">{displayName}</span>
            </>
          }
          description="Your current review queue, streak, and generated packs."
          actions={
            <>
              <Button size="sm" asChild>
                <Link href={dashboard.nextStudyHref}>
                  <Play className="size-4" />
                  {dashboard.nextStudyLabel}
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/browse">Browse</Link>
              </Button>
            </>
          }
        />

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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <AppStat
            variant="card"
            label="Current Streak"
            value={`${dashboard.stats.currentStreakDays} days`}
            icon={Flame}
            hint="Server-tracked study days"
            tone="warm"
          />
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
            label="Reviews Due"
            value={`${dashboard.stats.reviewsDue}`}
            icon={Play}
            hint={`${dashboard.stats.estimatedDueMinutes}m estimated`}
            tone="danger"
          />
          <AppStat
            variant="card"
            label="New Today"
            value={`${dashboard.stats.newCardsCompletedToday}/${dashboard.stats.newCardsPerDay}`}
            icon={Sparkles}
            hint={`${dashboard.stats.newCardsAvailableToday} available`}
            tone="accent"
          />
          <AppStat
            variant="card"
            label="Reviews This Week"
            value={`${dashboard.stats.reviewsCompletedThisWeek}`}
            icon={Clock3}
            hint="From review history"
            tone="success"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Jump Back In</CardTitle>
                  <CardDescription>Recent generated packs and mastery progress.</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/decks">Manage</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasPacks ? (
                dashboard.recentPacks.map((pack) => {
                  const progressPct = clampToInt(
                    (pack.masteredCount / Math.max(1, pack.totalCount)) * 100,
                  );

                  return (
                    <Link
                      key={pack.id}
                      href={pack.dueCount > 0 ? `/study/${pack.id}` : `/pack/${pack.id}`}
                      className="group block rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex gap-3">
                        <div className="relative h-[84px] w-[56px] shrink-0 overflow-hidden rounded-lg border bg-muted">
                          {pack.posterUrl ? (
                            <Image
                              src={pack.posterUrl}
                              alt={pack.title}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-muted-foreground">
                              <Layers className="size-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{pack.title}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <Badge variant="secondary">{pack.kind}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {pack.dueCount > 0 ? `${pack.dueCount} due` : "No due reviews"}
                                  {pack.dueCount === 0 && pack.newAvailableToday > 0
                                    ? `, ${pack.newAvailableToday} new today`
                                    : ""}
                                </span>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="shrink-0" asChild>
                              <span>
                                {pack.dueCount > 0
                                  ? "Review"
                                  : pack.newAvailableToday > 0
                                    ? "Learn new"
                                    : "Open"}
                              </span>
                            </Button>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Mastered</span>
                              <span className="font-medium text-foreground">
                                {pack.masteredCount}/{pack.totalCount}
                              </span>
                            </div>
                            <Progress value={progressPct} className="h-2" />
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

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Review Plan</CardTitle>
              <CardDescription>Due cards are computed from saved SRS dates.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Due now", value: dashboard.reviewPlan.dueNow },
                  {
                    label: "Later today",
                    value: dashboard.reviewPlan.dueLaterToday,
                  },
                  {
                    label: "Tomorrow",
                    value: dashboard.reviewPlan.dueTomorrow,
                  },
                  {
                    label: "New available",
                    value: dashboard.stats.newCardsAvailableToday,
                  },
                ].map((item) => (
                  <AppPanel key={item.label} className="p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                  </AppPanel>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Due now share</span>
                  <span>
                    {dashboard.reviewPlan.nextLearningDueAt
                      ? `Next step ${new Date(
                          dashboard.reviewPlan.nextLearningDueAt,
                        ).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}`
                      : `~${dashboard.stats.estimatedDueMinutes} min`}
                  </span>
                </div>
                <Progress value={todayLoadPct} className="h-2" />
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Focus packs</p>
                  <Badge variant="secondary">
                    {dashboard.reviewPlan.focusPacks.length > 0 ? "Needs attention" : "Clear"}
                  </Badge>
                </div>
                {dashboard.reviewPlan.focusPacks.length > 0 ? (
                  dashboard.reviewPlan.focusPacks.map((pack) => (
                    <Link
                      key={pack.id}
                      href={`/study/${pack.id}`}
                      className="block rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-medium">{pack.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {pack.due} due
                        </span>
                      </div>
                      <Progress
                        value={clampToInt((pack.due / Math.max(1, pack.total)) * 100)}
                        className="mt-2 h-1.5"
                      />
                    </Link>
                  ))
                ) : (
                  <AppEmptyState
                    icon={Play}
                    title="No due reviews"
                    description={
                      hasPacks
                        ? "Open decks to learn new cards or wait for the next scheduled step."
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
              </div>
            </CardContent>
          </Card>
        </div>
      </AppPageShell>
    </>
  );
}
