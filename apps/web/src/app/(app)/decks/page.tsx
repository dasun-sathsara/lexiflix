import {
  BookOpen,
  Calendar,
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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MediaType = "movie" | "tv";

interface Deck {
  id: string;
  title: string;
  subtitle?: string;
  mediaType: MediaType;
  posterUrl: string;
  newCards: number;
  learningCards: number;
  dueCards: number;
  totalCards: number;
  masteredCards: number;
  lastStudied?: Date;
  estimatedMinutes: number;
  streak: number;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_DECKS: Deck[] = [
  {
    id: "interstellar",
    title: "Interstellar",
    mediaType: "movie",
    posterUrl: "https://image.tmdb.org/t/p/w300_and_h450_bestv2/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    newCards: 12,
    learningCards: 8,
    dueCards: 15,
    totalCards: 42,
    masteredCards: 7,
    lastStudied: new Date(Date.now() - 1000 * 60 * 60 * 2),
    estimatedMinutes: 18,
    streak: 5,
  },
  {
    id: "inception",
    title: "Inception",
    mediaType: "movie",
    posterUrl: "https://image.tmdb.org/t/p/w300_and_h450_bestv2/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg",
    newCards: 5,
    learningCards: 3,
    dueCards: 8,
    totalCards: 38,
    masteredCards: 22,
    lastStudied: new Date(Date.now() - 1000 * 60 * 60 * 24),
    estimatedMinutes: 8,
    streak: 3,
  },
  {
    id: "stranger-things-s1",
    title: "Stranger Things",
    subtitle: "Season 1",
    mediaType: "tv",
    posterUrl: "https://image.tmdb.org/t/p/w300_and_h450_bestv2/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    newCards: 20,
    learningCards: 12,
    dueCards: 25,
    totalCards: 85,
    masteredCards: 28,
    lastStudied: new Date(Date.now() - 1000 * 60 * 30),
    estimatedMinutes: 28,
    streak: 7,
  },
  {
    id: "the-expanse-s1",
    title: "The Expanse",
    subtitle: "Season 1",
    mediaType: "tv",
    posterUrl:
      "https://resizing.flixster.com/a7VRb-2Xh__4_-Avt3x4qCdguzQ=/ems.cHJkLWVtcy1hc3NldHMvdHZzZWFzb24vUlRUVjU3ODk2OS53ZWJw",
    newCards: 15,
    learningCards: 10,
    dueCards: 18,
    totalCards: 68,
    masteredCards: 25,
    lastStudied: new Date(Date.now() - 1000 * 60 * 60 * 3),
    estimatedMinutes: 22,
    streak: 4,
  },
];

const MOCK_STATS = {
  totalDue: MOCK_DECKS.reduce((acc, d) => acc + d.dueCards, 0),
  totalNew: MOCK_DECKS.reduce((acc, d) => acc + d.newCards, 0),
  totalLearning: MOCK_DECKS.reduce((acc, d) => acc + d.learningCards, 0),
  longestStreak: Math.max(...MOCK_DECKS.map((d) => d.streak)),
  totalEstimatedMinutes: MOCK_DECKS.reduce((acc, d) => acc + d.estimatedMinutes, 0),
};

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
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs",
        styles[variant],
      )}
    >
      <span className="font-medium tabular-nums">{count}</span>
      <span className="opacity-75">{label}</span>
    </span>
  );
}

function DeckRow({ deck }: { deck: Deck }) {
  const progressPct = clampToInt((deck.masteredCards / Math.max(1, deck.totalCards)) * 100);
  const hasCardsToStudy = deck.newCards + deck.learningCards + deck.dueCards > 0;

  return (
    <div className="group flex items-center gap-4 rounded-2xl border bg-card/40 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-indigo-300/50 hover:bg-card/60 hover:shadow-md hover:shadow-indigo-500/10 dark:hover:border-indigo-500/30">
      {/* Poster */}
      <div className="relative h-[88px] w-[60px] shrink-0 overflow-hidden rounded-xl border bg-muted shadow-sm transition-shadow group-hover:shadow-md">
        <Image
          src={deck.posterUrl}
          alt={deck.title}
          fill
          sizes="60px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
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
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-semibold tracking-tight">{deck.title}</h3>
          {deck.subtitle && (
            <span className="hidden shrink-0 rounded-md border bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-block">
              {deck.subtitle}
            </span>
          )}
          {deck.streak > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-600 dark:text-amber-400">
              <Flame className="size-3 fill-current" />
              <span className="font-medium tabular-nums">{deck.streak}</span>
            </span>
          )}
        </div>

        {/* Row 2: Card count pills + last studied */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            <CardCountPill count={deck.newCards} label="new" variant="new" />
            <CardCountPill count={deck.learningCards} label="learning" variant="learning" />
            <CardCountPill count={deck.dueCards} label="due" variant="due" />
          </div>
          {deck.lastStudied && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(deck.lastStudied)}
            </span>
          )}
        </div>

        {/* Row 3: Progress + mastered ratio + est. time */}
        <div className="flex items-center gap-3">
          <Progress value={progressPct} className="h-1.5 flex-1 bg-muted/60" />
          <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
            {deck.masteredCards}
            <span className="mx-0.5 opacity-40">/</span>
            {deck.totalCards}
          </span>
          <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Clock className="size-3" />
            {deck.estimatedMinutes}m
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="size-8 p-0 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={`/pack/${deck.id}`} aria-label="Manage deck">
            <Layers className="size-4" />
          </Link>
        </Button>

        {hasCardsToStudy ? (
          <Button size="sm" className="gap-1.5 shadow-sm transition-all active:scale-95" asChild>
            <Link href={`/study/${deck.id}`}>
              <Play className="size-3.5 fill-current" />
              <span className="hidden sm:inline">Study</span>
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled className="opacity-50">
            Done
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DecksPage() {
  const hasDecks = MOCK_DECKS.length > 0;
  const totalCards = MOCK_STATS.totalDue + MOCK_STATS.totalNew + MOCK_STATS.totalLearning;

  return (
    <>
      <AppTopbar title="My Decks" />

      <AppPageShell className="gap-6">
        {/* Decorative background blobs */}
        <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-indigo-500/5 blur-[80px]" />
        <div className="pointer-events-none absolute -right-20 top-1/2 size-72 rounded-full bg-purple-500/5 blur-[80px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 size-64 rounded-full bg-rose-500/5 blur-[80px]" />

        {/* ---------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="flex flex-col gap-3">
          <AppPageHeader
            heading="My Decks"
            description={
              totalCards > 0
                ? `${totalCards} cards lined up for review today.`
                : "All caught up — excellent work keeping your streak alive."
            }
            actions={
              <>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/browse">
                    <Layers className="size-4" />
                    Browse Content
                  </Link>
                </Button>
                {totalCards > 0 && (
                  <Button
                    size="lg"
                    className="gap-1.5 shadow-sm transition-all active:scale-95"
                    asChild
                  >
                    <Link href={`/study/${MOCK_DECKS[0]?.id ?? "interstellar"}`}>
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
                <div className="inline-flex items-center gap-1.5 rounded-md border bg-card/40 px-3 py-1.5 text-sm">
                  <Calendar className="size-3.5 text-rose-500" />
                  <span className="font-semibold tabular-nums">{MOCK_STATS.totalDue}</span>
                  <span className="text-xs text-muted-foreground">due today</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-md border bg-card/40 px-3 py-1.5 text-sm">
                  <Sparkles className="size-3.5 text-indigo-500" />
                  <span className="font-semibold tabular-nums">{MOCK_STATS.totalNew}</span>
                  <span className="text-xs text-muted-foreground">new</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-md border bg-card/40 px-3 py-1.5 text-sm">
                  <BookOpen className="size-3.5 text-amber-500" />
                  <span className="font-semibold tabular-nums">{MOCK_STATS.totalLearning}</span>
                  <span className="text-xs text-muted-foreground">learning</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-md border bg-card/40 px-3 py-1.5 text-sm">
                  <Clock className="size-3.5 text-emerald-500" />
                  <span className="font-semibold tabular-nums">
                    {MOCK_STATS.totalEstimatedMinutes}m
                  </span>
                  <span className="text-xs text-muted-foreground">est. today</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-md border bg-card/40 px-3 py-1.5 text-sm">
                  <Flame className="size-3.5 text-amber-500" />
                  <span className="font-semibold tabular-nums">{MOCK_STATS.longestStreak}</span>
                  <span className="text-xs text-muted-foreground">top streak</span>
                </div>
              </>
            }
          />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Deck list                                                         */}
        {/* ---------------------------------------------------------------- */}
        {hasDecks ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <AppSectionHeader heading="Active Decks" className="gap-0" />
              <span className="text-xs text-muted-foreground">
                {MOCK_DECKS.length} {MOCK_DECKS.length === 1 ? "deck" : "decks"}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {MOCK_DECKS.map((deck) => (
                <DeckRow key={deck.id} deck={deck} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/20 py-14 text-center">
            <div className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
              <Layers className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No decks yet</p>
              <p className="mx-auto max-w-xs text-sm leading-6 text-muted-foreground">
                Browse movies and TV shows to generate vocabulary decks and start learning.
              </p>
            </div>
            <Button size="sm" asChild className="mt-1">
              <Link href="/browse">
                Browse Content
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}
      </AppPageShell>
    </>
  );
}
