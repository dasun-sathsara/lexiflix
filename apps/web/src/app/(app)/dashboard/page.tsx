import Image from "next/image";
import Link from "next/link";
import { BookOpen, Clock3, Flame, Play, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";

const MOCK_STATS = {
  userName: "Lexi Learner",
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
  {
    id: "the-bear",
    title: "The Bear",
    kind: "TV",
    posterUrl: "https://image.tmdb.org/t/p/w300_and_h450_bestv2/s1R7K0fCkI1d5mFvZp4YbQw7zVq.jpg",
    progressLabel: "Pre-learned",
    progressPct: 30,
  },
] as const;

const MOCK_ACTIVITY = [
  { day: "Mon", reviews: 8 },
  { day: "Tue", reviews: 14 },
  { day: "Wed", reviews: 10 },
  { day: "Thu", reviews: 18 },
  { day: "Fri", reviews: 22 },
  { day: "Sat", reviews: 12 },
  { day: "Sun", reviews: 16 },
] as const;

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
    <Card className={"relative overflow-hidden border " + accentStyles.border}>
      <div className={"pointer-events-none absolute inset-0 bg-gradient-to-br " + accentStyles.glow} />
      <CardContent className="relative flex items-start justify-between gap-4 p-6">
        <div className="flex items-start gap-3">
          <div className={"grid size-10 place-items-center rounded-xl border border-white/10 " + accentStyles.iconBg}>
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

function DailyGoalRing({ reviewed, target }: { reviewed: number; target: number }) {
  const pct = clampToInt((reviewed / Math.max(1, target)) * 100);
  const gradient = `conic-gradient(from 180deg, hsl(var(--primary)) ${pct}%, hsl(var(--muted)) 0%)`;

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative grid size-16 place-items-center rounded-full p-[3px] shadow-sm"
        style={{ background: gradient }}
      >
        <span className="sr-only">Daily goal: {reviewed}/{target}</span>
        <div className="grid size-full place-items-center rounded-full bg-background">
          <div className="text-center leading-tight">
            <div className="text-sm font-semibold">{reviewed}/{target}</div>
            <div className="text-[10px] text-muted-foreground">goal</div>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <p className="text-sm font-medium">Daily Goal</p>
        </div>
        <p className="text-xs text-muted-foreground">Keep your momentum—small wins stack.</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { dailyGoal } = MOCK_STATS;
  const dailyGoalPct = clampToInt((dailyGoal.reviewed / Math.max(1, dailyGoal.target)) * 100);
  const maxReviews = Math.max(...MOCK_ACTIVITY.map((d) => d.reviews), 1);

  return (
    <>
      <AppTopbar title="Dashboard" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6">
        <Card className="relative overflow-hidden border-indigo-200/60 dark:border-indigo-500/20">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
          <CardContent className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="border border-indigo-200/60 bg-white/60 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-950/30 dark:text-indigo-200">
                  Command Center
                </Badge>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome back, <span className="text-indigo-600 dark:text-indigo-300">{MOCK_STATS.userName}</span>
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                Your learning momentum is compounding. Keep the streak alive and clear today’s reviews.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" asChild>
                  <Link href="/pack/interstellar">Open Pack</Link>
                </Button>
                <Button size="sm" variant="secondary" asChild>
                  <Link href="/browse">Browse</Link>
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <DailyGoalRing reviewed={dailyGoal.reviewed} target={dailyGoal.target} />
              <div className="w-full max-w-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{dailyGoal.label}</span>
                  <span>{dailyGoalPct}%</span>
                </div>
                <Progress value={dailyGoalPct} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

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
                <Link href="/pack/interstellar">Start</Link>
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
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Jump Back In</CardTitle>
                  <CardDescription>Pick up where you left off—your packs are ready.</CardDescription>
                </div>
                <Button variant="secondary" asChild>
                  <Link href="/pack/interstellar">Open pack</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {MOCK_RECENT_PACKS.map((pack) => (
                <Link
                  key={pack.id}
                  href={`/pack/${pack.id}`}
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
                          <span className="group-hover:border-indigo-300/60 group-hover:bg-indigo-500/5 dark:group-hover:border-indigo-500/30">Resume</span>
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

          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5" />
            <CardHeader className="relative">
              <CardTitle>SRS Activity</CardTitle>
              <CardDescription>Reviews completed over the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="rounded-2xl border bg-card/40 p-4 backdrop-blur-sm">
                <div className="flex items-end gap-3">
                  {MOCK_ACTIVITY.map((d) => {
                    const heightPct = clampToInt((d.reviews / maxReviews) * 100);
                    return (
                      <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                        <div className="w-full rounded-xl bg-muted/50 p-1">
                          <div
                            className="w-full rounded-lg bg-gradient-to-t from-indigo-600/70 to-purple-500/60"
                            style={{ height: `${Math.max(18, Math.round((heightPct / 100) * 120))}px` }}
                          />
                          <span className="sr-only">{d.day}: {d.reviews} reviews</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{d.day}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
