"use client";

import { Check, Layers, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ignoreTermGloballyAction,
  markTermKnownAction,
  markTermLearningAction,
  removePackItemsAction,
  resetPackItemAction,
  resetPackProgressAction,
  restorePackItemAction,
  unignoreTermAction,
} from "@/features/packs/server/actions";
import type { PackCardView, PackStagingView } from "@/features/packs/types";

import { PackStagingCardItem } from "./pack-staging-card-item";
import { PackStagingHero } from "./pack-staging-hero";
import { PackStagingSidebar } from "./pack-staging-sidebar";

type TabValue = "all" | PackCardView["state"];

function label(value: string) {
  return value.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function toTabValue(value: string): TabValue {
  if (
    value === "new" ||
    value === "learning" ||
    value === "due" ||
    value === "mastered" ||
    value === "removed"
  ) {
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
          if (card.state === "removed") {
            counts.hidden += 1;
            return counts;
          }
          counts[card.state] += 1;
          counts.total += 1;
          return counts;
        },
        { new: 0, learning: 0, due: 0, mastered: 0, futureLearning: 0, hidden: 0, total: 0 },
      ),
    [cards],
  );
  const filtered = activeTab === "all" ? cards : cards.filter((item) => item.state === activeTab);
  const progressPct = Math.round((stats.mastered / Math.max(1, stats.total)) * 100);
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

  function runItemAction(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    startAction(async () => {
      const result = await action();
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
      <PackStagingHero pack={pack} stats={stats} progressPct={progressPct} />

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
                  {(["all", "new", "learning", "due", "mastered", "removed"] as const).map(
                    (tab) => (
                      <TabsTrigger key={tab} value={tab} className="gap-1.5">
                        {label(tab)}
                        <span className="text-xs opacity-70">
                          (
                          {tab === "all"
                            ? stats.total
                            : tab === "removed"
                              ? stats.hidden
                              : stats[tab]}
                          )
                        </span>
                      </TabsTrigger>
                    ),
                  )}
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
              filtered.map((item) => (
                <PackStagingCardItem
                  key={item.id}
                  item={item}
                  packId={pack.id}
                  isSelected={selectedIds.has(item.id)}
                  isSelectionMode={isSelectionMode}
                  pendingAction={pendingAction}
                  onToggleSelect={toggleSelect}
                  onRemoveCard={(id) => removeCards([id])}
                  onRunItemAction={runItemAction}
                  onRestore={() => restorePackItemAction({ packId: pack.id, itemId: item.id })}
                  onReset={() => resetPackItemAction({ packId: pack.id, itemId: item.id })}
                  onMarkKnown={() => markTermKnownAction({ packId: pack.id, itemId: item.id })}
                  onMarkLearning={() =>
                    markTermLearningAction({ packId: pack.id, itemId: item.id })
                  }
                  onIgnore={() =>
                    item.state === "removed"
                      ? unignoreTermAction({ packId: pack.id, itemId: item.id })
                      : ignoreTermGloballyAction({ packId: pack.id, itemId: item.id })
                  }
                />
              ))
            )}
          </div>
        </div>

        <PackStagingSidebar
          pack={pack}
          stats={stats}
          progressPct={progressPct}
          pendingAction={pendingAction}
          onResetPack={resetPack}
        />
      </div>
    </div>
  );
}
