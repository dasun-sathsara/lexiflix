import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Film,
  Flame,
  Layers,
  Play,
  Sparkles,
  Tv,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AppPageHeader, AppSectionHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { AppEmptyState, AppStat } from "@/components/common/app-surface";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { reconcileDueReviewNotificationForUser } from "@/features/notifications/server/queries";
import { getDeckSummariesForUser } from "@/features/packs/server/queries";
import type { DeckSummary } from "@/features/packs/types";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireSession } from "@/lib/auth-guards";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function clampToInt(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CardCountPill({
  count,
  label,
  variant,
}: {
  count: number;
  label: string;
  variant: "new" | "learning" | "due";
}) {
  if (count === 0) return null;

  const styles = {
    new: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/30",
    learning:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/30",
    due: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border px-2 py-0.5 text-xs",
        styles[variant],
      )}
    >
      <span className="font-medium tabular-nums">{count}</span>
      <span className="opacity-75">{label}</span>
    </span>
  );
}

function DeckRow({ deck }: { deck: DeckSummary }) {
  const cardsToStudy = deck.studyPlan.dueCount + deck.studyPlan.newAvailableToday;
  const readyCards = cardsToStudy;
  const todaysTotal = Math.max(readyCards, deck.studyPlan.newTotal);
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DecksPage() {
  const session = await requireSession();
  const [decks] = await Promise.all([
    getDeckSummariesForUser({ userId: session.user.id }),
    reconcileDueReviewNotificationForUser({ userId: session.user.id }),
  ]);
  const hasDecks = decks.length > 0;
  const stats = decks.reduce(
    (totals, deck) => {
      totals.totalDue += deck.studyPlan.dueCount;
      totals.totalNew += deck.studyPlan.newAvailableToday;
      totals.totalLearning += deck.studyPlan.futureLearningCount;
      totals.totalEstimatedMinutes +=
        deck.estimatedStudyMinutes ?? Math.max(1, Math.ceil(deck.counts.total * 1.5));
      return totals;
    },
    { totalDue: 0, totalNew: 0, totalLearning: 0, totalEstimatedMinutes: 0 },
  );
  const totalCards = stats.totalDue + stats.totalNew;
  const firstStudyDeck =
    decks.find((deck) => deck.studyPlan.dueCount > 0) ??
    decks.find((deck) => deck.studyPlan.newAvailableToday > 0);

  return (
    <>
      <AppTopbar title="Decks" />

      <AppPageShell>
        <section className="flex flex-col gap-4">
          <AppPageHeader
            heading="Decks"
            actions={
              <>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/browse">
                    <Layers className="size-4" />
                    Browse Content
                  </Link>
                </Button>
                {totalCards > 0 && (
                  <Button size="lg" className="gap-1.5" asChild>
                    <Link
                      href={`/study/${firstStudyDeck?.id ?? decks[0]?.id}?mode=${
                        firstStudyDeck?.studyPlan.dueCount ? "due" : "new"
                      }`}
                    >
                      <Play className="size-3.5 fill-current" />
                      Start Session
                      <ChevronRight className="size-3.5 opacity-60" />
                    </Link>
                  </Button>
                )}
              </>
            }
            stats={
              <>
                <AppStat icon={Calendar} label="Due Today" value={stats.totalDue} tone="danger" />
                <AppStat icon={Sparkles} label="New Today" value={stats.totalNew} tone="accent" />
                <AppStat
                  icon={BookOpen}
                  label="Scheduled"
                  value={stats.totalLearning}
                  tone="warm"
                />
                <AppStat
                  icon={Clock}
                  label="Est. Today"
                  value={`${stats.totalEstimatedMinutes}m`}
                  tone="success"
                />
                <AppStat icon={Flame} label="Decks" value={decks.length} tone="warm" />
              </>
            }
          />
        </section>

        {hasDecks ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <AppSectionHeader heading="Active Decks" className="gap-0" />
              <span className="text-xs text-muted-foreground">
                {decks.length} {decks.length === 1 ? "deck" : "decks"}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {decks.map((deck) => (
                <DeckRow key={deck.id} deck={deck} />
              ))}
            </div>
          </div>
        ) : (
          <AppEmptyState
            icon={Layers}
            title="No decks yet"
            description="Browse movies and TV shows to generate vocabulary decks and start learning."
            action={
              <Button size="sm" asChild>
                <Link href="/browse">
                  Browse Content
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            }
          />
        )}
      </AppPageShell>
    </>
  );
}
