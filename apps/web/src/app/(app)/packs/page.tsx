"use client";

import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock,
  Film,
  Layers,
  RotateCcw,
  Search,
  Sparkles,
  Tv,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { cn } from "@/lib/utils";

// Types for pack data
type MediaType = "movie" | "tv";
type PackStatus = "ready" | "generating" | "paused";

interface Pack {
  id: string;
  title: string;
  subtitle?: string;
  mediaType: MediaType;
  posterUrl: string;
  backdropUrl?: string;
  newCards: number;
  learningCards: number;
  dueCards: number;
  totalCards: number;
  masteredCards: number;
  lastAccessed?: Date;
  createdAt: Date;
  status: PackStatus;
  difficulty: {
    level: string;
    label: string;
  };
}

// Mock pack data
const MOCK_PACKS: Pack[] = [
  {
    id: "interstellar",
    title: "Interstellar",
    mediaType: "movie",
    posterUrl: "https://image.tmdb.org/t/p/w300_and_h450_bestv2/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg",
    newCards: 12,
    learningCards: 8,
    dueCards: 15,
    totalCards: 42,
    masteredCards: 7,
    lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 2),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    status: "ready",
    difficulty: {
      level: "B2",
      label: "Upper Intermediate",
    },
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
    lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    status: "ready",
    difficulty: {
      level: "B2",
      label: "Upper Intermediate",
    },
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
    lastAccessed: new Date(Date.now() - 1000 * 60 * 30),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    status: "ready",
    difficulty: {
      level: "B1",
      label: "Intermediate",
    },
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
    lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 3),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    status: "ready",
    difficulty: {
      level: "C1",
      label: "Advanced",
    },
  },
];

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

function getCefrBadgeClass(level: string) {
  const letter = level[0];
  if (letter === "A") {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:text-emerald-200 dark:border-emerald-500/20";
  }
  if (letter === "B") {
    return "bg-amber-500/10 text-amber-800 border-amber-200/60 dark:text-amber-200 dark:border-amber-500/20";
  }
  return "bg-rose-500/10 text-rose-700 border-rose-200/60 dark:text-rose-200 dark:border-rose-500/20";
}

// Stat Pill for card counts
function StatPill({
  count,
  label,
  variant,
}: {
  count: number;
  label: string;
  variant: "new" | "learning" | "due" | "mastered";
}) {
  const styles = {
    new: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/30",
    learning:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/30",
    due: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/30",
    mastered:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/30",
  };

  if (count === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-normal",
        styles[variant],
      )}
    >
      <span className="font-normal tabular-nums">{count}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}

// Pack Card Component
function PackCard({ pack }: { pack: Pack }) {
  const progressPct = clampToInt((pack.masteredCards / Math.max(1, pack.totalCards)) * 100);
  const totalActive = pack.newCards + pack.learningCards + pack.dueCards;

  return (
    <Link href={`/pack/${pack.id}`} className="group block">
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-indigo-300/60 dark:hover:border-indigo-500/30">
        <CardContent className="relative p-4">
          <div className="flex gap-4">
            {/* Poster */}
            <div className="relative h-[120px] w-[80px] shrink-0 overflow-hidden rounded-lg border bg-muted shadow-sm transition-shadow duration-300 group-hover:shadow-md">
              <Image
                src={pack.posterUrl}
                alt={pack.title}
                fill
                sizes="80px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute bottom-1 right-1">
                <div className="flex size-5 items-center justify-center rounded-md bg-black/60 backdrop-blur-sm">
                  {pack.mediaType === "movie" ? (
                    <Film className="size-3 text-white/90" />
                  ) : (
                    <Tv className="size-3 text-white/90" />
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
              {/* Title row */}
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold tracking-tight">
                        {pack.title}
                      </h3>
                      {pack.subtitle && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {pack.subtitle}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge
                        className={"border text-xs " + getCefrBadgeClass(pack.difficulty.level)}
                      >
                        {pack.difficulty.level}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{pack.totalCards} cards</span>
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100" />
                </div>
              </div>

              {/* Status pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <StatPill count={pack.newCards} label="new" variant="new" />
                <StatPill count={pack.learningCards} label="learning" variant="learning" />
                <StatPill count={pack.dueCards} label="due" variant="due" />
                <StatPill count={pack.masteredCards} label="mastered" variant="mastered" />
              </div>

              {/* Progress */}
              <div className="flex items-center gap-3">
                <Progress value={progressPct} className="h-1.5 flex-1 bg-muted/50" />
                <span className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">
                  {progressPct}%
                </span>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {pack.lastAccessed && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatRelativeTime(pack.lastAccessed)}
                  </span>
                )}
                {totalActive > 0 && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="size-3" />
                    {totalActive} to review
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Summary stats
function computeStats(packs: Pack[]) {
  return {
    totalPacks: packs.length,
    totalCards: packs.reduce((acc, p) => acc + p.totalCards, 0),
    totalNew: packs.reduce((acc, p) => acc + p.newCards, 0),
    totalLearning: packs.reduce((acc, p) => acc + p.learningCards, 0),
    totalDue: packs.reduce((acc, p) => acc + p.dueCards, 0),
    totalMastered: packs.reduce((acc, p) => acc + p.masteredCards, 0),
  };
}

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

type TabValue = "all" | "movie" | "tv";

export default function PacksPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<TabValue>("all");
  const packs = MOCK_PACKS;

  const filteredPacks = React.useMemo(() => {
    let result = packs;

    // Filter by media type
    if (activeTab !== "all") {
      result = result.filter((p) => p.mediaType === activeTab);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(query) || p.subtitle?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [packs, activeTab, searchQuery]);

  const stats = computeStats(packs);
  const hasPacks = packs.length > 0;

  return (
    <>
      <AppTopbar title="My Packs" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-5 p-6 lg:p-8">
        {/* Subtle background blobs */}
        <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-indigo-500/5 blur-[80px]" />
        <div className="pointer-events-none absolute -right-20 top-1/2 size-72 rounded-full bg-purple-500/5 blur-[80px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 size-72 rounded-full bg-rose-500/5 blur-[80px]" />

        {/* Header Card */}
        <Card className="relative overflow-hidden border-indigo-200/60 bg-card/40 backdrop-blur-lg shadow-lg shadow-indigo-500/5 dark:border-indigo-500/20">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-transparent to-purple-500/8" />
          <CardContent className="relative p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">Staging Area</h1>
                <p className="text-sm text-muted-foreground">
                  Manage and review your flashcard packs
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/decks">
                    <Sparkles className="size-4 mr-1.5" />
                    Study Session
                  </Link>
                </Button>
                <Button
                  size="default"
                  className="gap-2 shadow-md transition-all hover:scale-105 active:scale-95"
                  asChild
                >
                  <Link href="/browse">
                    <Search className="size-4" />
                    Browse Content
                    <ChevronRight className="size-4 opacity-50" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border/50 pt-4 sm:grid-cols-5">
              <StatItem
                label="Packs"
                value={stats.totalPacks.toString()}
                icon={Layers}
                accent={{ bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-300" }}
              />
              <StatItem
                label="New"
                value={stats.totalNew.toString()}
                icon={Sparkles}
                accent={{ bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400" }}
              />
              <StatItem
                label="Learning"
                value={stats.totalLearning.toString()}
                icon={RotateCcw}
                accent={{ bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" }}
              />
              <StatItem
                label="Due"
                value={stats.totalDue.toString()}
                icon={Clock}
                accent={{ bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" }}
              />
              <StatItem
                label="Total"
                value={stats.totalCards.toString()}
                icon={BookOpen}
                accent={{ bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Filters & Search */}
        <Card className="bg-card/40 backdrop-blur-sm">
          <CardContent className="px-4 py-2 sm:py-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
                <TabsList>
                  <TabsTrigger value="all" className="gap-1.5">
                    All
                    <span className="text-xs font-normal opacity-70">({packs.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="movie" className="gap-1.5">
                    <Film className="size-3.5" />
                    Movies
                    <span className="text-xs font-normal opacity-70">
                      ({packs.filter((p) => p.mediaType === "movie").length})
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="tv" className="gap-1.5">
                    <Tv className="size-3.5" />
                    Series
                    <span className="text-xs font-normal opacity-70">
                      ({packs.filter((p) => p.mediaType === "tv").length})
                    </span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search packs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pack List */}
        {hasPacks ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-normal text-muted-foreground">
                {filteredPacks.length === packs.length
                  ? `${packs.length} pack${packs.length === 1 ? "" : "s"}`
                  : `${filteredPacks.length} of ${packs.length} packs`}
              </h2>
            </div>

            {filteredPacks.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredPacks.map((pack) => (
                  <PackCard key={pack.id} pack={pack} />
                ))}
              </div>
            ) : (
              <Card className="border-dashed bg-card/40">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Search className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">No packs found</p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search or filter criteria.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveTab("all");
                    }}
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="border-dashed bg-card/40 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="grid size-16 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Layers className="size-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">No packs yet</h3>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Browse movies and TV shows to generate vocabulary packs and start managing your
                  flashcards.
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

        {/* Info Card */}
        <Card className="border-indigo-200/60 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 dark:border-indigo-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="size-4" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">What is the Staging Area?</div>
                <p className="text-xs text-muted-foreground">
                  The staging area lets you manage your vocabulary packs before studying. Review
                  your extracted flashcards, remove words you already know, and organize your
                  learning material. When you're ready, head to{" "}
                  <Link
                    href="/decks"
                    className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    My Decks
                  </Link>{" "}
                  to start your SRS study sessions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
