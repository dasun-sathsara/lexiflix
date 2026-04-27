"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock,
  Eye,
  Film,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Tv,
  Volume2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { removePackItemsAction, resetPackProgressAction } from "@/features/packs/server/actions";
import type { PackCardView, PackStagingView } from "@/features/packs/types";
import { cn } from "@/lib/utils";

type TabValue = "all" | PackCardView["state"];

function cefrBadgeClass(level: string | null) {
  if (!level) {
    return "bg-muted text-muted-foreground border-border";
  }
  if (level.startsWith("A")) {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:text-emerald-200 dark:border-emerald-500/20";
  }
  if (level.startsWith("B")) {
    return "bg-amber-500/10 text-amber-800 border-amber-200/60 dark:text-amber-200 dark:border-amber-500/20";
  }
  return "bg-rose-500/10 text-rose-700 border-rose-200/60 dark:text-rose-200 dark:border-rose-500/20";
}

function statusBadgeClass(status: PackCardView["state"]) {
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

function statusIcon(status: PackCardView["state"]) {
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

function label(value: string) {
  return value.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function truncate(text: string | null, max = 180) {
  if (!text) {
    return "No generated meaning was saved for this card.";
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}...`;
}

function toTabValue(value: string): TabValue {
  if (value === "new" || value === "learning" || value === "due" || value === "mastered") {
    return value;
  }
  return "all";
}

export function PackStagingClient({ pack }: { pack: PackStagingView }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabValue>("all");
  const [cards, setCards] = React.useState(pack.cards);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [pendingAction, startAction] = React.useTransition();

  const stats = React.useMemo(
    () =>
      cards.reduce(
        (counts, card) => {
          counts[card.state] += 1;
          counts.total += 1;
          return counts;
        },
        { new: 0, learning: 0, due: 0, mastered: 0, total: 0 },
      ),
    [cards],
  );
  const filtered = activeTab === "all" ? cards : cards.filter((item) => item.state === activeTab);
  const progressPct = Math.round((stats.mastered / Math.max(1, stats.total)) * 100);
  const cardsToStudy = pack.studyPlan.dueCount + pack.studyPlan.newAvailableToday;
  const selectedCount = selectedIds.size;

  function removeCards(itemIds: string[]) {
    startAction(async () => {
      const previousCards = cards;
      setCards((current) => current.filter((card) => !itemIds.includes(card.id)));
      setSelectedIds(new Set());
      setIsSelectionMode(false);

      const result = await removePackItemsAction({ packId: pack.id, itemIds });
      if (!result.ok) {
        setCards(previousCards);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function resetPack() {
    startAction(async () => {
      const result = await resetPackProgressAction({ packId: pack.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function toggleSelect(cardId: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((previous) =>
      previous.size === filtered.length ? new Set() : new Set(filtered.map((card) => card.id)),
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-6">
      <Card className="relative overflow-hidden border-indigo-200/60 dark:border-indigo-500/20">
        {pack.media.backdropUrl ? (
          <div className="absolute inset-0">
            <Image
              src={pack.media.backdropUrl}
              alt={`${pack.media.title} backdrop`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
          </div>
        ) : null}
        <CardContent className="relative p-6 sm:p-8">
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
                  {pack.media.kind === "movie" ? (
                    <Film className="mr-1 size-3.5" />
                  ) : (
                    <Tv className="mr-1 size-3.5" />
                  )}
                  Study Pack
                </Badge>
                {pack.learnerCefrLevelAtGeneration ? (
                  <Badge className={`border ${cefrBadgeClass(pack.learnerCefrLevelAtGeneration)}`}>
                    {pack.learnerCefrLevelAtGeneration}
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {pack.media.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {[
                    pack.media.releaseYear,
                    pack.media.subtitle,
                    `${stats.total} active cards`,
                    `${pack.studyPlan.futureLearningCount} scheduled`,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>

              <div className="max-w-md space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Overall progress</span>
                  <span className="font-normal text-foreground">{progressPct}% mastered</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {cardsToStudy > 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  <span>
                    ~{pack.estimatedStudyMinutes ?? Math.max(1, Math.ceil(stats.total * 1.5))} min
                  </span>
                </div>
              ) : null}
              {pack.studyPlan.dueCount > 0 ? (
                <Button size="default" className="gap-2 shadow-sm" asChild>
                  <Link href={`/study/${pack.id}?mode=due`}>
                    <Play className="size-4" />
                    Review Due
                    <Badge variant="secondary" className="ml-1 bg-white/20 text-white">
                      {pack.studyPlan.dueCount}
                    </Badge>
                  </Link>
                </Button>
              ) : pack.studyPlan.newAvailableToday > 0 ? (
                <Button size="default" className="gap-2 shadow-sm" asChild>
                  <Link href={`/study/${pack.id}?mode=new`}>
                    <Play className="size-4" />
                    Learn New
                    <Badge variant="secondary" className="ml-1 bg-white/20 text-white">
                      {pack.studyPlan.newAvailableToday}
                    </Badge>
                  </Link>
                </Button>
              ) : (
                <Button size="default" className="gap-2 shadow-sm" disabled>
                  <Play className="size-4" />
                  Complete For Now
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="size-4 text-muted-foreground" />
                    Flashcards
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Generated meanings and generated examples for this pack.
                  </CardDescription>
                </div>
                {isSelectionMode ? (
                  <div className="flex items-center gap-2">
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
                          disabled={selectedCount === 0 || pendingAction}
                          className="gap-1.5"
                        >
                          <Trash2 className="size-3.5" />
                          Remove selected ({selectedCount})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove selected cards?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes {selectedCount} card
                            {selectedCount === 1 ? "" : "s"} from this pack only. Resetting the pack
                            can restore them.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeCards(Array.from(selectedIds))}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSelectionMode(true)}
                    className="gap-1.5"
                    disabled={cards.length === 0}
                  >
                    <Check className="size-3.5" />
                    Select
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(toTabValue(value))}>
                <TabsList className="w-full justify-start">
                  {(["all", "new", "learning", "due", "mastered"] as const).map((tab) => (
                    <TabsTrigger key={tab} value={tab} className="gap-1.5">
                      {label(tab)}
                      <span className="text-xs opacity-70">
                        ({tab === "all" ? stats.total : stats[tab]})
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value={activeTab} className="mt-3 space-y-3">
                  {isSelectionMode && filtered.length > 0 ? (
                    <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2">
                      <Checkbox
                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                        onCheckedChange={toggleSelectAll}
                        id="select-all"
                      />
                      <label htmlFor="select-all" className="text-sm text-muted-foreground">
                        {selectedIds.size === filtered.length
                          ? "Deselect all"
                          : `Select all (${filtered.length})`}
                      </label>
                    </div>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{filtered.length}</span>{" "}
                    of <span className="font-medium text-foreground">{cards.length}</span> cards
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

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
                        ? "This pack has no active cards."
                        : `No ${activeTab} cards right now.`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filtered.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const firstExample = item.exampleSentences[0] ?? null;

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
                        {isSelectionMode ? (
                          <div className="flex items-start pt-1">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(item.id)}
                            />
                          </div>
                        ) : null}

                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold tracking-tight">
                              {item.displayText}
                            </span>
                            <Badge variant="secondary">{label(item.kind)}</Badge>
                            {item.partOfSpeech ? (
                              <Badge variant="outline">{item.partOfSpeech}</Badge>
                            ) : null}
                            <Badge className={`border ${cefrBadgeClass(item.cefrLevel)}`}>
                              {item.cefrLevel ?? "CEFR n/a"}
                            </Badge>
                            <Badge className={`gap-1 border ${statusBadgeClass(item.state)}`}>
                              {statusIcon(item.state)}
                              {label(item.state)}
                            </Badge>
                            {item.audioUrl ? (
                              <Badge variant="outline" className="gap-1">
                                <Volume2 className="size-3" />
                                Audio
                              </Badge>
                            ) : null}
                          </div>

                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              {truncate(item.meaning)}
                            </p>
                            {firstExample ? (
                              <p className="text-sm italic text-foreground/80">
                                Generated example: &quot;{firstExample}&quot;
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {!isSelectionMode ? (
                          <div className="flex shrink-0 items-start gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-muted-foreground hover:text-foreground"
                                  asChild
                                >
                                  <Link
                                    href={`/study/${pack.id}?mode=preview&card=${item.id}`}
                                    aria-label={`Preview ${item.displayText}`}
                                  >
                                    <Eye className="size-4" />
                                    <span className="sr-only">Preview {item.displayText}</span>
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Preview card</TooltipContent>
                            </Tooltip>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-muted-foreground hover:text-destructive"
                                  disabled={pendingAction}
                                  aria-label={`Remove ${item.displayText}`}
                                  title="Remove card"
                                >
                                  <Trash2 className="size-4" />
                                  <span className="sr-only">Remove {item.displayText}</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Remove &quot;{item.displayText}&quot;?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This removes the card from this pack only. It does not mark the
                                    term known or ignored.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeCards([item.id])}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ready to Learn?</CardTitle>
              <CardDescription>
                {pack.studyPlan.dueCount > 0
                  ? `You have ${pack.studyPlan.dueCount} due cards.`
                  : pack.studyPlan.newAvailableToday > 0
                    ? `${pack.studyPlan.newAvailableToday} new cards are available today.`
                    : "There are no scheduled cards ready right now."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pack.studyPlan.dueCount > 0 ? (
                <Button className="w-full gap-2" size="lg" asChild>
                  <Link href={`/study/${pack.id}?mode=due`}>
                    <Play className="size-4" />
                    Review Due
                  </Link>
                </Button>
              ) : pack.studyPlan.newAvailableToday > 0 ? (
                <Button className="w-full gap-2" size="lg" asChild>
                  <Link href={`/study/${pack.id}?mode=new`}>
                    <Sparkles className="size-4" />
                    Learn New
                  </Link>
                </Button>
              ) : (
                <Button className="w-full gap-2" size="lg" disabled>
                  <Play className="size-4" />
                  Complete For Now
                </Button>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-1.5" size="sm" asChild>
                  <Link href="/decks">
                    <Layers className="size-3.5" />
                    Decks
                  </Link>
                </Button>
                {pack.media.mediaInfoHref ? (
                  <Button variant="outline" className="flex-1 gap-1.5" size="sm" asChild>
                    <Link href={pack.media.mediaInfoHref}>
                      <BookOpen className="size-3.5" />
                      Media Info
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1 gap-1.5" size="sm" disabled>
                    <BookOpen className="size-3.5" />
                    Media Info
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pack Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total cards</span>
                <span className="font-normal">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Due now</span>
                <span className="font-normal">{pack.studyPlan.dueCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">New today</span>
                <span className="font-normal">{pack.studyPlan.newAvailableToday}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Future learning</span>
                <span className="font-normal">{pack.studyPlan.futureLearningCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Hidden/removed</span>
                <span className="font-normal">{pack.studyPlan.hiddenCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Est. study time</span>
                <span className="font-normal">
                  ~{pack.estimatedStudyMinutes ?? Math.max(1, Math.ceil(stats.total * 1.5))} min
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mastery rate</span>
                <span className="font-medium">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-2" />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full gap-1.5 border-amber-200/60 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/10"
                    disabled={pendingAction}
                  >
                    <RotateCcw className="size-3.5" />
                    Reset Pack Progress
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset this pack?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This restores removed cards and resets all cards to new. Review history is not
                      deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={resetPack}
                      className="bg-amber-600 text-white hover:bg-amber-600/90"
                    >
                      Reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
