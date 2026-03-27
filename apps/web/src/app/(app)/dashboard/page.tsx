import { BookOpen, ChevronRight, Clock3, Flame, GraduationCap, Play } from "lucide-react";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { shouldShowAssessmentBanner } from "@/features/assessment/server/profile";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { auth } from "@/lib/auth";

const MOCK_STATS = {
  dailyGoal: {
    reviewed: 15,
    target: 20,
    label: "Words reviewed",
  },
  currentStreakDays: 12,
  totalWordsLearned: 482,
  reviewsDue: 24,
  timeSpentHours: 4.5,
} as const;

const MOCK_RECENT_PACKS = [
  {
    id: "inception",
    title: "Inception",
    kind: "Movie",
    posterUrl: "https://image.tmdb.org/t/p/w300_and_h450_bestv2/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
    progressLabel: "Pre-learned",
    progressPct: 80,
  },
  {
    id: "stranger-things",
    title: "Stranger Things",
    kind: "TV",
    posterUrl: "https://image.tmdb.org/t/p/w300_and_h450_bestv2/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    progressLabel: "Pre-learned",
    progressPct: 55,
  },
] as const;

const MOCK_REVIEW_PLAN = {
  dueNow: 12,
  dueLaterToday: 18,
  dueTomorrow: 26,
  estimatedMinutes: 24,
  focusPacks: [{ id: "interstellar", title: "Interstellar", due: 9, accuracy: 78 }],
} as const;

function clampToInt(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function StatCard({
  title,
  value,
  icon,
  hint,
  right,
  accent = "indigo",
}: {
  title: string;
  value: string;
  icon: ReactNode;
  hint?: string;
  right?: ReactNode;
  accent?: "indigo" | "amber" | "emerald" | "rose";
}) {
  const accentStyles = {
    indigo: {
      iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
      border: "border-indigo-200/60 dark:border-indigo-500/20",
      glow: "from-indigo-500/10 via-transparent to-purple-500/10",
    },
    amber: {
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
      border: "border-amber-200/60 dark:border-amber-500/20",
      glow: "from-amber-500/10 via-transparent to-orange-500/10",
    },
    emerald: {
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
      border: "border-emerald-200/60 dark:border-emerald-500/20",
      glow: "from-emerald-500/10 via-transparent to-cyan-500/10",
    },
    rose: {
      iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
      border: "border-rose-200/60 dark:border-rose-500/20",
      glow: "from-rose-500/10 via-transparent to-pink-500/10",
    },
  }[accent];

  return (
    <Card
      className={
        "relative overflow-hidden border py-0 bg-card/40 backdrop-blur-lg shadow-md shadow-black/5 " +
        accentStyles.border
      }
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentStyles.glow}`}
      />
      <CardContent className="relative flex items-start justify-between gap-4 p-4">
        <div className="flex items-start gap-3">
          <div
            className={
              "grid size-10 place-items-center rounded-xl border border-white/10 " +
              accentStyles.iconBg
            }
          >
            {icon}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const showAssessmentBanner = session?.user
    ? await shouldShowAssessmentBanner(session.user.id)
    : true;
  const displayName =
    session?.user?.name?.trim() || session?.user?.email?.split("@")[0] || "Learner";

  const { dailyGoal } = MOCK_STATS;
  const todayLoad = MOCK_REVIEW_PLAN.dueNow + MOCK_REVIEW_PLAN.dueLaterToday - dailyGoal.reviewed;
  const todayLoadPct = clampToInt((todayLoad / Math.max(1, dailyGoal.target)) * 100);

  return (
    <>
      <AppTopbar title="Dashboard" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 p-6">
        {/* Decorative Background Blobs */}
        <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-indigo-500/5 blur-[80px]" />
        <div className="pointer-events-none absolute -right-20 top-1/2 size-72 rounded-full bg-purple-500/5 blur-[80px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 size-72 rounded-full bg-rose-500/5 blur-[80px]" />

        <Card className="relative overflow-hidden border-indigo-200/60 bg-card/40 backdrop-blur-lg shadow-xl shadow-indigo-500/5 dark:border-indigo-500/20">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
          <CardContent className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="border border-indigo-200/60 bg-white/40 text-indigo-700 backdrop-blur-md dark:border-indigo-500/20 dark:bg-indigo-950/30 dark:text-indigo-200"
                >
                  Command Center
                </Badge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome back,{" "}
                <span className="text-indigo-600 dark:text-indigo-300">{displayName}</span>
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                Your learning momentum is compounding. Keep the streak alive and clear today’s
                reviews.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" asChild>
                  <Link href="/decks">My Decks</Link>
                </Button>
                <Button size="sm" variant="secondary" asChild>
                  <Link href="/browse">Browse</Link>
                </Button>
              </div>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-2 sm:items-end"></div>
          </CardContent>
        </Card>

        {showAssessmentBanner ? (
          <Card className="group relative overflow-hidden border-2 border-amber-200/60 bg-card/40 py-0 backdrop-blur-lg shadow-lg shadow-amber-500/5 dark:border-amber-500/30">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10" />
            <div className="pointer-events-none absolute -right-12 -top-12 size-32 rotate-12 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-400/20 blur-2xl transition-transform duration-500 group-hover:scale-150" />
            <CardContent className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600 dark:border-amber-500/30 dark:text-amber-400">
                  <GraduationCap className="size-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Discover Your Level</h3>
                    <Badge
                      variant="secondary"
                      className="border border-amber-200/60 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:text-amber-300"
                    >
                      New
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Take a quick 2-minute assessment to unlock personalized learning
                    recommendations.
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="gap-2 bg-gradient-to-r tracking-tight from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-600 hover:to-orange-600"
              >
                <Link href="/onboarding/assessment">
                  Start Assessment
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Current Streak"
            value={`${MOCK_STATS.currentStreakDays} days`}
            icon={<Flame className="h-5 w-5" />}
            hint="Don’t break the chain"
            accent="rose"
          />
          <StatCard
            title="Total Words Learned"
            value={`${MOCK_STATS.totalWordsLearned}`}
            icon={<BookOpen className="h-5 w-5" />}
            hint="Lifetime mastered"
            accent="indigo"
          />
          <StatCard
            title="Reviews Due"
            value={`${MOCK_STATS.reviewsDue}`}
            icon={<Play className="h-5 w-5" />}
            hint="SRS queue waiting"
            accent="amber"
            right={
              <Button size="sm" asChild className="shadow-sm">
                <Link href="/decks">Start</Link>
              </Button>
            }
          />
          <StatCard
            title="Time Spent"
            value={`${MOCK_STATS.timeSpentHours} hrs`}
            icon={<Clock3 className="h-5 w-5" />}
            hint="This week"
            accent="emerald"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="relative overflow-hidden bg-card/40 backdrop-blur-lg shadow-md shadow-black/5">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Jump Back In</CardTitle>
                  <CardDescription>
                    Pick up where you left off—your packs are ready.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/decks">Manage</Link>
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link href="/decks">Study</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {MOCK_RECENT_PACKS.map((pack) => (
                <Link
                  key={pack.id}
                  href={`/study/${pack.id}`}
                  className="group block rounded-2xl border bg-card/40 p-3 shadow-sm backdrop-blur-sm transition-colors hover:bg-card/60"
                >
                  <div className="flex gap-4">
                    <div className="relative h-[92px] w-[64px] shrink-0 overflow-hidden rounded-xl border bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                      <Image
                        src={pack.posterUrl}
                        alt={pack.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{pack.title}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="secondary">{pack.kind}</Badge>
                            <span className="text-xs text-muted-foreground">Pack ready</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0" asChild>
                          <span className="group-hover:border-indigo-300/60 group-hover:bg-indigo-500/5 dark:group-hover:border-indigo-500/30">
                            Resume
                          </span>
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{pack.progressLabel}</span>
                          <span className="font-medium text-foreground">{pack.progressPct}%</span>
                        </div>
                        <Progress value={pack.progressPct} className="h-2" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-card/40 backdrop-blur-lg shadow-md shadow-black/5">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5" />
            <CardHeader className="relative">
              <CardTitle>Review Plan</CardTitle>
              <CardDescription>Prioritize the cards that matter most today.</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    label: "Due now",
                    value: MOCK_REVIEW_PLAN.dueNow,
                    note: "Start here",
                  },
                  {
                    label: "Later today",
                    value: MOCK_REVIEW_PLAN.dueLaterToday,
                    note: "Afternoon boost",
                  },
                  {
                    label: "Tomorrow",
                    value: MOCK_REVIEW_PLAN.dueTomorrow,
                    note: "Stay ahead",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border bg-card/60 p-3 shadow-sm backdrop-blur-sm"
                  >
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                    <p className="text-[11px] text-muted-foreground">{item.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Today’s review load</span>
                  <span>~{MOCK_REVIEW_PLAN.estimatedMinutes} min</span>
                </div>
                <Progress value={todayLoadPct} className="h-2" />
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Focus packs</p>
                  <Badge variant="secondary">Needs attention</Badge>
                </div>
                {MOCK_REVIEW_PLAN.focusPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className="rounded-2xl border bg-card/50 p-3 shadow-sm backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{pack.title}</span>
                      <span className="text-xs text-muted-foreground">{pack.due} due</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="shrink-0">Accuracy</span>
                      <Progress value={pack.accuracy} className="h-1.5 flex-1" />
                      <span className="w-8 shrink-0 text-right text-foreground">
                        {pack.accuracy}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
