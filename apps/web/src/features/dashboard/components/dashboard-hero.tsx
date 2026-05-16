import { CalendarClock, Flame, Play } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LoadRing } from "@/features/dashboard/components/load-ring";
import type { PlanTone } from "@/features/dashboard/lib/utils";
import { planToneDot } from "@/features/dashboard/lib/utils";
import { cn } from "@/lib/utils";

interface PlanItem {
  label: string;
  value: number;
  tone: PlanTone;
}

interface DashboardHeroProps {
  streakDays: number;
  hasWorkNow: boolean;
  readyNow: number;
  displayName: string;
  heroDescription: string;
  nextStudyHref: string;
  nextStudyLabel: string;
  todayLoadPct: number;
  planItems: PlanItem[];
}

export function DashboardHero({
  streakDays,
  hasWorkNow,
  readyNow,
  displayName,
  heroDescription,
  nextStudyHref,
  nextStudyLabel,
  todayLoadPct,
  planItems,
}: DashboardHeroProps) {
  return (
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
                <Flame className="size-3" />🔥 {streakDays}-Day Momentum
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
              {hasWorkNow ? `${readyNow} targets ready` : "Vault Consolidated"}
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
              <Link href={nextStudyHref}>
                <Play className="size-4" />
                {nextStudyLabel}
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
  );
}
