"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock,
  Eye,
  Film,
  Filter,
  GraduationCap,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Tv,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { cn } from "@/lib/utils";

// Pack metadata
const MOVIE_DATA = {
  title: "Interstellar",
  year: 2014,
  genres: ["Sci-Fi", "Drama"],
  mediaType: "movie" as const,
  difficulty: {
    level: "B2",
    label: "Upper Intermediate",
  },
  stats: {
    wordsExtracted: 42,
    idioms: 15,
    newCards: 12,
    learningCards: 8,
    dueCards: 15,
    masteredCards: 7,
  },
  backdropUrl: "https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg",
  estimatedMinutes: 18,
} as const;

type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type PartOfSpeech = "Noun" | "Verb" | "Idiom" | "Adjective" | "Phrasal Verb";
type CardStatus = "new" | "learning" | "due" | "mastered";

type FlashcardItem = {
  id: string;
  term: string;
  partOfSpeech: PartOfSpeech;
  cefr: CefrLevel;
  definition: string;
  context: string;
  status: CardStatus;
  dueDate?: Date;
  interval?: number; // days
};

const VOCAB_LIST: FlashcardItem[] = [
  {
    id: "relativity",
    term: "Relativity",
    partOfSpeech: "Noun",
    cefr: "C1",
    definition:
      "A scientific principle describing how measurements of time and space depend on the observer's motion and gravitational field.",
    context: "Relativity dictates that time moves slower here than it does on Earth.",
    status: "new",
  },
  {
    id: "tether",
    term: "Tether",
    partOfSpeech: "Verb",
    cefr: "B2",
    definition:
      "To tie or fasten something so it stays connected and cannot move freely; to restrict movement by attaching a line.",
    context: "Tether the lander—if the wind picks up, we can't afford to drift.",
    status: "learning",
    interval: 1,
  },
  {
    id: "magnitude",
    term: "Magnitude",
    partOfSpeech: "Noun",
    cefr: "B2",
    definition:
      "The size, extent, or importance of something—often used for forces, effects, or measurements.",
    context: "The magnitude of the wave is enough to crush the engines.",
    status: "due",
    dueDate: new Date(),
  },
  {
    id: "make-do",
    term: "Make do",
    partOfSpeech: "Phrasal Verb",
    cefr: "B1",
    definition:
      "To manage with limited resources; to accept what is available and continue anyway.",
    context: "We'll have to make do with what we have—there's no resupply out here.",
    status: "mastered",
    interval: 21,
  },
  {
    id: "salvage",
    term: "Salvage",
    partOfSpeech: "Verb",
    cefr: "B2",
    definition:
      "To rescue or recover something valuable from loss, damage, or destruction; to save what remains.",
    context: "If we can salvage the comms array, we might still call them.",
    status: "new",
  },
  {
    id: "rendezvous",
    term: "Rendezvous",
    partOfSpeech: "Noun",
    cefr: "C1",
    definition:
      "A planned meeting at a specific time and place; in spaceflight, the act of docking or meeting in orbit.",
    context: "We'll rendezvous with the station at the edge of the gravity well.",
    status: "due",
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours overdue
  },
  {
    id: "in-the-long-run",
    term: "In the long run",
    partOfSpeech: "Idiom",
    cefr: "B1",
    definition: "Over a long period of time; eventually, when considering the future consequences.",
    context: "In the long run, the risk is worth it if we can secure a new home.",
    status: "learning",
    interval: 3,
  },
  {
    id: "calibrate",
    term: "Calibrate",
    partOfSpeech: "Verb",
    cefr: "C1",
    definition:
      "To adjust an instrument or process carefully so it produces accurate results; to fine-tune.",
    context: "Calibrate the sensors again—something's off with the readings.",
    status: "new",
  },
];

function cefrBadgeClass(level: CefrLevel) {
  const letter = level[0];
  if (letter === "A") {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:text-emerald-200 dark:border-emerald-500/20";
  }
  if (letter === "B") {
    return "bg-amber-500/10 text-amber-800 border-amber-200/60 dark:text-amber-200 dark:border-amber-500/20";
  }
  return "bg-rose-500/10 text-rose-700 border-rose-200/60 dark:text-rose-200 dark:border-rose-500/20";
}

function statusBadgeClass(status: CardStatus) {
  switch (status) {
    case "new":
      return "bg-indigo-500/10 text-indigo-700 border-indigo-200/60 dark:text-indigo-300 dark:border-indigo-500/20";
    case "learning":
      return "bg-amber-500/10 text-amber-700 border-amber-200/60 dark:text-amber-300 dark:border-amber-500/20";
    case "due":
      return "bg-rose-500/10 text-rose-700 border-rose-200/60 dark:text-rose-300 dark:border-rose-500/20";
    case "mastered":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:text-emerald-300 dark:border-emerald-500/20";
  }
}

function statusIcon(status: CardStatus) {
  switch (status) {
    case "new":
      return <Sparkles className="size-3" />;
    case "learning":
      return <RotateCcw className="size-3" />;
    case "due":
      return <Clock className="size-3" />;
    case "mastered":
      return <Check className="size-3" />;
  }
}

function statusLabel(status: CardStatus) {
  switch (status) {
    case "new":
      return "New";
    case "learning":
      return "Learning";
    case "due":
      return "Due";
    case "mastered":
      return "Mastered";
  }
}

function truncate(text: string, max = 120) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

type TabValue = "all" | "new" | "learning" | "due" | "mastered";

function toTabValue(tab: string): TabValue {
  if (tab === "new" || tab === "learning" || tab === "due" || tab === "mastered") return tab;
  return "all";
}

// Stat Badge for header
function StatBadge({
  count,
  label,
  variant,
}: {
  count: number;
  label: string;
  variant: "new" | "learning" | "due" | "mastered";
}) {
  const styles = {
    new: "bg-indigo-500/10 text-indigo-700 border-indigo-200/60 dark:text-indigo-300 dark:border-indigo-500/20",
    learning:
      "bg-amber-500/10 text-amber-700 border-amber-200/60 dark:text-amber-300 dark:border-amber-500/20",
    due: "bg-rose-500/10 text-rose-700 border-rose-200/60 dark:text-rose-300 dark:border-rose-500/20",
    mastered:
      "bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:text-emerald-300 dark:border-emerald-500/20",
  };

  return (
    <div className={cn("flex items-center gap-1.5 rounded-lg border px-2 py-1", styles[variant])}>
      <span className="text-base font-normal tabular-nums">{count}</span>
      <span className="text-[11px] opacity-80">{label}</span>
    </div>
  );
}

export default function PackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const packId = id;

  const [activeTab, setActiveTab] = React.useState<TabValue>("all");
  const [cards, setCards] = React.useState<FlashcardItem[]>(VOCAB_LIST);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);

  // Calculate stats
  const stats = React.useMemo(() => {
    return {
      new: cards.filter((c) => c.status === "new").length,
      learning: cards.filter((c) => c.status === "learning").length,
      due: cards.filter((c) => c.status === "due").length,
      mastered: cards.filter((c) => c.status === "mastered").length,
      total: cards.length,
    };
  }, [cards]);

  const filtered = React.useMemo(() => {
    if (activeTab === "all") return cards;
    return cards.filter((item) => item.status === activeTab);
  }, [activeTab, cards]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const handleDeleteSelected = () => {
    setCards((prev) => prev.filter((c) => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleDeleteSingle = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleResetAll = () => {
    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        status: "new" as CardStatus,
        interval: undefined,
        dueDate: undefined,
      })),
    );
  };

  const progressPct = Math.round((stats.mastered / Math.max(1, stats.total)) * 100);
  const cardsToStudy = stats.new + stats.learning + stats.due;

  return (
    <>
      <AppTopbar title="Study Pack" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-6">
        {/* Hero Header Card */}
        <Card className="relative overflow-hidden border-indigo-200/60 dark:border-indigo-500/20">
          <div className="absolute inset-0">
            <Image
              src={MOVIE_DATA.backdropUrl}
              alt={`${MOVIE_DATA.title} backdrop`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-purple-500/10" />
          </div>

          <CardContent className="relative p-6 sm:p-8">
            {/* Back button */}
            <div className="mb-5 -mt-1">
              <Button variant="ghost" size="sm" asChild className="gap-2 hover:bg-background/60">
                <Link href="/decks">
                  <ArrowLeft className="size-4" />
                  Back to Decks
                </Link>
              </Button>
            </div>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="border border-indigo-200/60 bg-white/60 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-950/30 dark:text-indigo-200"
                  >
                    {MOVIE_DATA.mediaType === "movie" ? (
                      <Film className="mr-1 size-3.5" />
                    ) : (
                      <Tv className="mr-1 size-3.5" />
                    )}
                    Study Pack
                  </Badge>
                  <Badge
                    className={"border " + cefrBadgeClass(MOVIE_DATA.difficulty.level as CefrLevel)}
                  >
                    {MOVIE_DATA.difficulty.level} — {MOVIE_DATA.difficulty.label}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    {MOVIE_DATA.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {MOVIE_DATA.year} • {MOVIE_DATA.genres.join(" • ")}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="max-w-md space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Overall progress</span>
                    <span className="font-normal text-foreground">{progressPct}% mastered</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {cardsToStudy > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="size-4" />
                    <span>~{MOVIE_DATA.estimatedMinutes} min</span>
                  </div>
                )}
                <Button
                  size="default"
                  className="gap-2 shadow-sm"
                  asChild
                  disabled={cardsToStudy === 0}
                >
                  <Link href={`/study/${packId}`}>
                    <Play className="size-4" />
                    Start Learning
                    {cardsToStudy > 0 && (
                      <Badge variant="secondary" className="ml-1 bg-white/20 text-white">
                        {cardsToStudy}
                      </Badge>
                    )}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left column - Card list */}
          <div className="space-y-6">
            {/* Filters and Actions Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Filter className="size-4 text-muted-foreground" />
                      Flashcards
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Review and manage your flashcard deck before studying.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSelectionMode ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsSelectionMode(false);
                            setSelectedIds(new Set());
                          }}
                        >
                          Cancel
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={selectedIds.size === 0}
                              className="gap-1.5"
                            >
                              <Trash2 className="size-3.5" />
                              Delete ({selectedIds.size})
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete selected cards?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {selectedIds.size} flashcard
                                {selectedIds.size > 1 ? "s" : ""} from this deck. This action cannot
                                be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteSelected}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSelectionMode(true)}
                        className="gap-1.5"
                      >
                        <Check className="size-3.5" />
                        Select
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(toTabValue(v))}
                  className="space-y-3"
                >
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="all" className="gap-1.5">
                      All
                      <span className="text-xs opacity-70">({stats.total})</span>
                    </TabsTrigger>
                    <TabsTrigger value="new" className="gap-1.5">
                      New
                      <span className="text-xs opacity-70">({stats.new})</span>
                    </TabsTrigger>
                    <TabsTrigger value="learning" className="gap-1.5">
                      Learning
                      <span className="text-xs opacity-70">({stats.learning})</span>
                    </TabsTrigger>
                    <TabsTrigger value="due" className="gap-1.5">
                      Due
                      <span className="text-xs opacity-70">({stats.due})</span>
                    </TabsTrigger>
                    <TabsTrigger value="mastered" className="gap-1.5">
                      Mastered
                      <span className="text-xs opacity-70">({stats.mastered})</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab}>
                    {isSelectionMode && filtered.length > 0 && (
                      <div className="mb-3 flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                        <Checkbox
                          checked={selectedIds.size === filtered.length && filtered.length > 0}
                          onCheckedChange={handleSelectAll}
                          id="select-all"
                        />
                        <label htmlFor="select-all" className="text-sm text-muted-foreground">
                          {selectedIds.size === filtered.length
                            ? "Deselect all"
                            : `Select all (${filtered.length})`}
                        </label>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-medium text-foreground">{filtered.length}</span>{" "}
                      of <span className="font-medium text-foreground">{cards.length}</span> cards
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Card List */}
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                    <div className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                      <Layers className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">No cards in this category</p>
                      <p className="text-sm text-muted-foreground">
                        {activeTab === "all"
                          ? "This deck is empty."
                          : `No ${activeTab} cards at the moment.`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filtered.map((item) => {
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        "overflow-hidden transition-all",
                        isSelected && "ring-2 ring-primary ring-offset-2",
                      )}
                    >
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex gap-4">
                          {/* Selection checkbox */}
                          {isSelectionMode && (
                            <div className="flex items-start pt-1">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleSelect(item.id)}
                              />
                            </div>
                          )}

                          {/* Content */}
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-lg font-semibold tracking-tight">
                                {item.term}
                              </span>
                              <Badge variant="secondary">{item.partOfSpeech}</Badge>
                              <Badge className={"border " + cefrBadgeClass(item.cefr)}>
                                {item.cefr}
                              </Badge>
                              <Badge className={"border gap-1 " + statusBadgeClass(item.status)}>
                                {statusIcon(item.status)}
                                {statusLabel(item.status)}
                              </Badge>
                            </div>

                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">
                                {truncate(item.definition, 180)}
                              </p>
                              <p className="text-sm italic text-foreground/80">"{item.context}"</p>
                            </div>

                            {/* Status info */}
                            {item.status === "learning" && item.interval && (
                              <p className="text-xs text-muted-foreground">
                                Review again in {item.interval} day
                                {item.interval > 1 ? "s" : ""}
                              </p>
                            )}
                            {item.status === "mastered" && item.interval && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                Next review in {item.interval} days
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          {!isSelectionMode && (
                            <div className="flex shrink-0 items-start gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-foreground"
                                asChild
                              >
                                <Link href={`/study/${packId}?card=${item.id}`}>
                                  <Eye className="size-4" />
                                  <span className="sr-only">Preview</span>
                                </Link>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="size-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete "{item.term}"?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently remove this flashcard from your deck.
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteSingle(item.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Right column - Sidebar */}
          <aside className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ready to Learn?</CardTitle>
                <CardDescription>
                  {cardsToStudy > 0
                    ? `You have ${cardsToStudy} cards waiting for review.`
                    : "All caught up! No cards to review right now."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full gap-2" size="lg" asChild disabled={cardsToStudy === 0}>
                  <Link href={`/study/${packId}`}>
                    <Play className="size-4" />
                    Start Learning
                  </Link>
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-1.5" size="sm" asChild>
                    <Link href="/decks">
                      <Layers className="size-3.5" />
                      All Decks
                    </Link>
                  </Button>
                  <Button variant="outline" className="flex-1 gap-1.5" size="sm" asChild>
                    <Link href={`/media/${packId}`}>
                      <BookOpen className="size-3.5" />
                      Media Info
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Study Tips */}
            <Card className="border-indigo-200/60 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 dark:border-indigo-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <GraduationCap className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Staging Area</div>
                    <p className="text-xs text-muted-foreground">
                      Review your flashcards before studying. Remove any words you already know or
                      don't want to learn to focus on what matters.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deck Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Deck Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total cards</span>
                  <span className="font-normal">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Est. study time</span>
                  <span className="font-normal">~{MOVIE_DATA.estimatedMinutes} min</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mastery rate</span>
                  <span className="font-medium">{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />

                {/* Reset All Cards */}
                {stats.total > stats.new && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 gap-1.5 text-amber-600 border-amber-200/60 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:border-amber-500/30 dark:hover:bg-amber-500/10"
                      >
                        <RotateCcw className="size-3.5" />
                        Reset All Cards
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset all cards to new?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will reset all {stats.total} cards to &quot;new&quot; status,
                          clearing any learning progress. Your SRS intervals will be reset. This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleResetAll}
                          className="bg-amber-600 text-white hover:bg-amber-600/90"
                        >
                          Reset All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}
