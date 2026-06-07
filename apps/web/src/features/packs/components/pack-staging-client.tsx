"use client";

import { Check, Layers, Loader2, Trash2 } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePackStaging } from "@/features/packs/hooks/use-pack-staging";
import type { PackStagingView, PackVocabularyKind } from "@/features/packs/types";
import { formatVocabularyKindLabel, VOCABULARY_KINDS } from "@/lib/domain/vocabulary";

import { PackStagingCardItem } from "./pack-staging-card-item";
import { PackStagingHero } from "./pack-staging-hero";
import { PackStagingPagination } from "./pack-staging-pagination";
import { PackStagingSidebar } from "./pack-staging-sidebar";

const VOCABULARY_TYPE_FILTERS = VOCABULARY_KINDS;

function label(value: string) {
  return value.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

export function PackStagingClient({ pack }: { pack: PackStagingView }) {
  const {
    activeTab,
    setActiveTab,
    vocabularyType,
    setVocabularyType,
    cards,
    selectedIds,
    isSelectionMode,
    pendingAction,
    stats,
    stateFilteredCards,
    vocabularyTypeCounts,
    filtered,
    visibleCards,
    page,
    pageSize,
    totalPages,
    pageRange,
    setPage,
    setPageSize,
    progressPct,
    selectedCount,
    removeCards,
    resetPack,
    runItemAction,
    toggleSelect,
    toggleSelectAll,
    enterSelectionMode,
    exitSelectionMode,
    getItemActions,
  } = usePackStaging(pack);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-6">
      <PackStagingHero pack={pack} stats={stats} progressPct={progressPct} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="size-4 text-muted-foreground" />
                    Flashcards
                    {pendingAction ? (
                      <Loader2
                        className="size-3.5 animate-spin text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : null}
                  </CardTitle>
                </div>
                {isSelectionMode ? (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={exitSelectionMode}>
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
                          {pendingAction ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
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
                    onClick={enterSelectionMode}
                    className="gap-1.5"
                    disabled={cards.length === 0}
                  >
                    <Check className="size-3.5" />
                    Select
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="px-4 pb-3 pt-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start">
                  {(["all", "new", "learning", "due", "mastered", "removed"] as const).map(
                    (tab) => (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className="gap-1.5"
                        disabled={pendingAction}
                      >
                        {label(tab)}
                        <span className="opacity-70">
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
                <TabsContent value={activeTab} className="mt-1.5 space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      {filtered.length > 0 ? (
                        <>
                          Showing{" "}
                          <span className="font-medium text-foreground">
                            {pageRange.start}–{pageRange.end}
                          </span>{" "}
                          of <span className="font-medium text-foreground">{filtered.length}</span>{" "}
                          matching cards
                          {filtered.length !== cards.length ? <> · {cards.length} total</> : null}
                        </>
                      ) : (
                        "No cards match the current filters"
                      )}
                    </p>
                    <Select
                      value={vocabularyType}
                      onValueChange={setVocabularyType}
                      disabled={pendingAction}
                    >
                      <SelectTrigger className="h-8 w-full sm:w-[250px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          All vocabulary types ({stateFilteredCards.length})
                        </SelectItem>
                        {VOCABULARY_TYPE_FILTERS.map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {formatVocabularyKindLabel(kind)} (
                            {vocabularyTypeCounts[kind as PackVocabularyKind]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isSelectionMode && filtered.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2">
                      <Checkbox
                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                        onCheckedChange={toggleSelectAll}
                        id="select-all"
                        disabled={pendingAction}
                      />
                      <label htmlFor="select-all" className="text-sm text-muted-foreground">
                        {selectedIds.size === filtered.length
                          ? "Deselect all"
                          : `Select all (${filtered.length})`}
                      </label>
                      {selectedCount > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {selectedCount} selected across all pages of this filter
                        </span>
                      ) : null}
                    </div>
                  ) : null}
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
                    <p className="text-muted-foreground">
                      {vocabularyType !== "all"
                        ? `No ${label(vocabularyType).toLowerCase()} cards match this filter.`
                        : activeTab === "all"
                          ? "This pack has no active cards."
                          : `No ${activeTab} cards right now.`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              visibleCards.map((item) => {
                const itemActions = getItemActions(item);
                return (
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
                    onRestore={itemActions.onRestore}
                    onReset={itemActions.onReset}
                    onMarkKnown={itemActions.onMarkKnown}
                    onMarkLearning={itemActions.onMarkLearning}
                    onIgnore={itemActions.onIgnore}
                  />
                );
              })
            )}
          </div>

          <PackStagingPagination
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalItems={filtered.length}
            disabled={pendingAction}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
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
