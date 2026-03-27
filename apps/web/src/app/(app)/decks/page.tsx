"use client";

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

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { cn } from "@/lib/utils";

// Types for deck data
type MediaType = "movie" | "tv";

interface Deck {
  id: string;
  title: string;
  subtitle?: string; // e.g., "Season 1" for TV shows
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

// Mock deck data - only active decks
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
    lastStudied: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
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
    lastStudied: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
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
    lastStudied: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
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
    lastStudied: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    estimatedMinutes: 22,
    streak: 4,
  },
];

// Summary stats
const MOCK_STATS = {
  totalDue: MOCK_DECKS.reduce((acc, d) => acc + d.dueCards, 0),
  totalNew: MOCK_DECKS.reduce((acc, d) => acc + d.newCards, 0),
  totalLearning: MOCK_DECKS.reduce((acc, d) => acc + d.learningCards, 0),
  longestStreak: Math.max(...MOCK_DECKS.map((d) => d.streak)),
  totalEstimatedMinutes: MOCK_DECKS.reduce((acc, d) => acc + d.estimatedMinutes, 0),
};

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

// Compact Stat Badge
function StatPill({
  count,
  label,
  variant,
}: {
  count: number;
  label: string;
  variant: "new" | "learning" | "due";
}) {
  const styles = {
    new: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/30",
    learning:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/30",
    due: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/30",
  };

  if (count === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-normal",
        styles[variant],
      )}
    >
      <span className="font-normal">{count}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}

// Summary Stat Item (inline)
function StatItem({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: {
    bg: string;
    text: string;
  };
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("grid size-10 place-items-center rounded-xl", accent.bg, accent.text)}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-xl font-normal tracking-tight">{value}</div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// Deck Row Component
function DeckRow({ deck }: { deck: Deck }) {
  const progressPct = clampToInt((deck.masteredCards / Math.max(1, deck.totalCards)) * 100);
  const hasCardsToStudy = deck.newCards + deck.learningCards + deck.dueCards > 0;

  return (
    <div className="group flex items-center gap-5 rounded-2xl border bg-card/40 p-4 shadow-sm backdrop-blur-sm transition-all hover:bg-card/60 hover:shadow-md hover:border-indigo-300/50 dark:hover:border-indigo-500/30">
      {/* Poster */}
      <div className="relative h-[92px] w-[64px] shrink-0 overflow-hidden rounded-xl border bg-muted shadow-sm group-hover:shadow-md transition-shadow">
        <Image
          src={deck.posterUrl}
          alt={deck.title}
          fill
          sizes="64px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute bottom-1 right-1">
          <div className="flex size-5 items-center justify-center rounded-md bg-black/60 backdrop-blur-sm">
            {deck.mediaType === "movie" ? (
              <Film className="size-3 text-white/90" />
            ) : (
              <Tv className="size-3 text-white/90" />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold tracking-tight text-foreground/90">
                {deck.title}
              </h3>
              {deck.subtitle && (
                <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                  {deck.subtitle}
                </span>
              )}
              {deck.streak > 0 && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-normal text-amber-600 dark:text-amber-400">
                  <Flame className="size-3 fill-current" />
                  {deck.streak}
                </span>
              )}
            </div>

            {/* Status pills */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatPill count={deck.newCards} label="new" variant="new" />
              <StatPill count={deck.learningCards} label="learning" variant="learning" />
              <StatPill count={deck.dueCards} label="due" variant="due" />
            </div>
          </div>
        </div>

        {/* Progress row */}
        <div className="flex items-center gap-4 pr-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Progress value={progressPct} className="h-2 flex-1 bg-muted/50" />
            <span className="shrink-0 text-xs font-normal text-muted-foreground">
              {deck.masteredCards} <span className="opacity-50">/</span> {deck.totalCards}
            </span>
          </div>
          {deck.lastStudied && (
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
              {formatRelativeTime(deck.lastStudied)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={`/pack/${deck.id}`}>
            <Layers className="size-4" />
            <span className="sr-only">Manage</span>
          </Link>
        </Button>
        {hasCardsToStudy ? (
          <Button
            size="default"
            className="gap-2 shadow-sm transition-transform active:scale-95"
            asChild
          >
            <Link href={`/study/${deck.id}`}>
              <Play className="size-4 fill-current" />
              <span className="hidden sm:inline">Study</span>
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className="opacity-50" disabled>
            Done
          </Button>
        )}
      </div>
    </div>
  );
}

export default function DecksPage() {
  const hasDecks = MOCK_DECKS.length > 0;
  const totalCards = MOCK_STATS.totalDue + MOCK_STATS.totalNew + MOCK_STATS.totalLearning;

  return (
    <>
      <AppTopbar title="My Decks" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 lg:p-8">
        {/* Subtle background - matched to dashboard */}
        <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-indigo-500/5 blur-[80px]" />
        <div className="pointer-events-none absolute -right-20 top-1/2 size-72 rounded-full bg-purple-500/5 blur-[80px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 size-72 rounded-full bg-rose-500/5 blur-[80px]" />

        {/* Header Card - More compact */}
        <Card className="relative overflow-hidden border-indigo-200/60 bg-card/40 backdrop-blur-lg shadow-lg shadow-indigo-500/5 dark:border-indigo-500/20">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-transparent to-purple-500/8" />
          <CardContent className="relative p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Left side */}
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">Review Queue</h1>
                <p className="text-sm text-muted-foreground">
                  {totalCards > 0
                    ? `You have ${totalCards} cards lined up for review today.`
                    : "All caught up! Excellent work keeping your streak alive."}
                </p>
              </div>

              {/* Right side - CTA */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="default" asChild>
                  <Link href="/browse">
                    <Layers className="size-4 mr-1.5" />
                    Browse Content
                  </Link>
                </Button>
                {totalCards > 0 && (
                  <Button
                    size="default"
                    className="gap-2 shadow-md transition-all hover:scale-105 active:scale-95"
                    asChild
                  >
                    <Link href={`/study/${MOCK_DECKS[0]?.id || "interstellar"}`}>
                      <Play className="size-4 fill-current" />
                      Start Session
                      <ChevronRight className="size-4 opacity-50" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Stats row - more compact */}
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border/50 pt-4 sm:grid-cols-4">
              <StatItem
                label="Due today"
                value={MOCK_STATS.totalDue.toString()}
                icon={Calendar}
                accent={{ bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" }}
              />
              <StatItem
                label="New cards"
                value={MOCK_STATS.totalNew.toString()}
                icon={Sparkles}
                accent={{ bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400" }}
              />
              <StatItem
                label="Learning"
                value={MOCK_STATS.totalLearning.toString()}
                icon={BookOpen}
                accent={{ bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" }}
              />
              <StatItem
                label="Est. time"
                value={`${MOCK_STATS.totalEstimatedMinutes}m`}
                icon={Clock}
                accent={{ bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Deck List */}
        {hasDecks ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold tracking-tight">Active Decks</h2>
            </div>
            {MOCK_DECKS.map((deck) => (
              <DeckRow key={deck.id} deck={deck} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed bg-card/40 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="grid size-16 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Layers className="size-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">No decks yet</h3>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Browse movies and TV shows to generate vocabulary decks and start learning.
                </p>
              </div>
              <Button asChild className="mt-4 gap-2">
                <Link href="/browse">
                  Browse Content
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
