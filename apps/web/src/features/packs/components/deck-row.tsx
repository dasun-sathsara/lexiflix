import { CheckCircle2, Clock, Film, Layers, Play, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CardCountPill } from "@/features/packs/components/card-count-pill";
import { clampToInt } from "@/features/packs/components/utils";
import { formatRelativeTime } from "@/features/packs/lib/format";
import type { DeckSummary } from "@/features/packs/types";
import { cn } from "@/lib/ui/cn";

interface DeckRowProps {
  deck: DeckSummary;
}

export function DeckRow({ deck }: DeckRowProps) {
  const cardsToStudy = deck.studyPlan.dueCount + deck.studyPlan.newAvailableToday;
  const readyCards = cardsToStudy;
  const todaysTotal = Math.max(readyCards, deck.studyPlan.newAvailableToday);
  const completedToday = Math.max(0, todaysTotal - readyCards);
  const todayProgressPct = todaysTotal > 0 ? clampToInt((completedToday / todaysTotal) * 100) : 100;
  const hasCardsToStudy = cardsToStudy > 0;
  const studyHref =
    deck.studyPlan.dueCount > 0 ? `/study/${deck.id}?mode=due` : `/study/${deck.id}?mode=new`;

  return (
    <div className="group flex flex-col gap-3 rounded-[calc(var(--radius)+2px)] border bg-card/70 p-3 shadow-sm backdrop-blur-sm transition-colors duration-200 ease-out hover:border-primary/25 hover:bg-card sm:flex-row sm:items-center sm:gap-4 sm:p-4">
      {/* Poster */}
      <div className="relative h-[88px] w-[60px] shrink-0 overflow-hidden rounded-xl border bg-muted shadow-sm">
        {deck.posterUrl ? (
          <Image
            src={deck.posterUrl}
            alt={deck.title}
            fill
            sizes="60px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Layers className="size-5" />
          </div>
        )}
        {/* Media type badge */}
        <div className="absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-md bg-black/60 backdrop-blur-sm">
          {deck.mediaType === "movie" ? (
            <Film className="size-3 text-white/90" />
          ) : (
            <Tv className="size-3 text-white/90" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Row 1: Title + subtitle + streak */}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold tracking-tight">{deck.title}</h3>
          {deck.subtitle ? (
            <span className="hidden shrink-0 rounded-md border bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-block">
              {deck.subtitle}
            </span>
          ) : null}
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
              hasCardsToStudy
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-emerald-200/60 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/20 dark:text-emerald-300",
            )}
          >
            {hasCardsToStudy ? `${cardsToStudy} ready` : "Complete for now"}
          </span>
        </div>

        {/* Row 2: Card count pills + last studied */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            <CardCountPill
              count={deck.studyPlan.newAvailableToday}
              label="new today"
              variant="new"
            />
            <CardCountPill
              count={deck.studyPlan.futureLearningCount}
              label="scheduled"
              variant="learning"
            />
            <CardCountPill count={deck.studyPlan.dueCount} label="due" variant="due" />
          </div>
          {deck.lastStudiedAt ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(new Date(deck.lastStudiedAt))}
            </span>
          ) : null}
        </div>

        {/* Row 3: Today's progress + ready count + est. time */}
        <div className="flex items-center gap-3">
          <div className="flex min-w-[160px] flex-1 items-center gap-2">
            <Progress
              value={todayProgressPct}
              className={cn(
                "h-1.5 flex-1 bg-muted/50",
                todayProgressPct === 0 && "[&>div]:bg-muted-foreground/20",
                todayProgressPct > 0 && todayProgressPct < 100 && "[&>div]:bg-primary/50",
                todayProgressPct === 100 && "[&>div]:bg-emerald-500/65",
              )}
            />
            <span className="w-8 shrink-0 text-right tabular-nums text-xs text-muted-foreground">
              {todayProgressPct}%
            </span>
          </div>
          <span className="hidden shrink-0 tabular-nums text-xs text-muted-foreground sm:inline">
            {completedToday}
            <span className="mx-0.5 opacity-40">/</span>
            {todaysTotal}
          </span>
          <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Clock className="size-3" />
            {deck.estimatedStudyMinutes ?? Math.max(1, Math.ceil(deck.counts.total * 1.5))}m
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2 self-stretch sm:self-auto">
        <Button size="sm" variant="outline" className="flex-1 gap-1.5 sm:flex-none" asChild>
          <Link href={`/pack/${deck.id}`}>
            <Layers className="size-4" />
            <span className="sm:hidden lg:inline">Open Pack</span>
          </Link>
        </Button>

        {hasCardsToStudy ? (
          <Button size="sm" className="flex-1 gap-1.5 sm:flex-none" asChild>
            <Link href={studyHref}>
              <Play className="size-3.5 fill-current" />
              {deck.studyPlan.dueCount > 0 ? "Review Due" : "Learn New"}
            </Link>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled
            className="flex-1 gap-1.5 opacity-80 sm:flex-none"
          >
            <CheckCircle2 className="size-3.5" />
            Complete
          </Button>
        )}
      </div>
    </div>
  );
}
