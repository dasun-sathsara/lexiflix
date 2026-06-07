import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import {
  clampPage,
  DEFAULT_PACK_STAGING_PAGE_SIZE,
  getPageRange,
  getPageSlice,
  getTotalPages,
} from "@/features/packs/lib/pagination";
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
import type { PackCardView, PackStagingView, PackVocabularyKind } from "@/features/packs/types";
import type { ActionResult } from "@/lib/contracts/action-result";

export type TabValue = "all" | PackCardView["state"];
export type VocabularyTypeFilter = "all" | PackVocabularyKind;

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

export function usePackStaging(pack: PackStagingView) {
  const router = useRouter();
  const [activeTab, setActiveTabRaw] = React.useState<TabValue>("all");
  const [vocabularyType, setVocabularyTypeRaw] = React.useState<VocabularyTypeFilter>("all");
  const [cards, setCards] = React.useState(pack.cards);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [pendingAction, startAction] = React.useTransition();
  const [page, setPageRaw] = React.useState(1);
  const [pageSize, setPageSizeRaw] = React.useState<number>(DEFAULT_PACK_STAGING_PAGE_SIZE);

  React.useEffect(() => {
    setCards(pack.cards);
  }, [pack.cards]);

  // Drop selections for cards that no longer exist once fresh server data arrives.
  React.useEffect(() => {
    const availableIds = new Set(pack.cards.map((card) => card.id));

    setSelectedIds((previous) => {
      if (previous.size === 0) {
        return previous;
      }

      const next = new Set([...previous].filter((id) => availableIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [pack.cards]);

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

  const stateFilteredCards =
    activeTab === "all" ? cards : cards.filter((item) => item.state === activeTab);

  const vocabularyTypeCounts = React.useMemo(
    () =>
      stateFilteredCards.reduce<Record<PackVocabularyKind, number>>(
        (counts, card) => {
          counts[card.kind] += 1;
          return counts;
        },
        { word: 0, phrasal_verb: 0, idiom: 0, slang: 0 },
      ),
    [stateFilteredCards],
  );

  const filtered =
    vocabularyType === "all"
      ? stateFilteredCards
      : stateFilteredCards.filter((item) => item.kind === vocabularyType);

  const progressPct = Math.round((stats.mastered / Math.max(1, stats.total)) * 100);
  const selectedCount = selectedIds.size;

  const totalPages = getTotalPages(filtered.length, pageSize);
  // Clamp on read as well as on write so removals cannot leave the view on a dead page.
  const currentPage = clampPage(page, totalPages);
  const visibleCards = getPageSlice(filtered, currentPage, pageSize);
  const pageRange = getPageRange(currentPage, pageSize, filtered.length);

  React.useEffect(() => {
    setPageRaw((previous) => clampPage(previous, totalPages));
  }, [totalPages]);

  function setPage(nextPage: number) {
    setPageRaw(clampPage(nextPage, totalPages));
  }

  function setPageSize(nextPageSize: number) {
    setPageSizeRaw(nextPageSize);
    setPageRaw(1);
  }

  function setActiveTab(value: string) {
    setActiveTabRaw(toTabValue(value));
    setSelectedIds(new Set());
    setPageRaw(1);
  }

  function setVocabularyType(value: string) {
    setVocabularyTypeRaw(value as VocabularyTypeFilter);
    setSelectedIds(new Set());
    setPageRaw(1);
  }

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

  function runItemAction(action: () => Promise<ActionResult<unknown>>) {
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

  function enterSelectionMode() {
    setIsSelectionMode(true);
  }

  function exitSelectionMode() {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }

  function getItemActions(item: PackCardView) {
    return {
      onRestore: () => restorePackItemAction({ packId: pack.id, itemId: item.id }),
      onReset: () => resetPackItemAction({ packId: pack.id, itemId: item.id }),
      onMarkKnown: () => markTermKnownAction({ packId: pack.id, itemId: item.id }),
      onMarkLearning: () => markTermLearningAction({ packId: pack.id, itemId: item.id }),
      onIgnore: () =>
        item.state === "removed"
          ? unignoreTermAction({ packId: pack.id, itemId: item.id })
          : ignoreTermGloballyAction({ packId: pack.id, itemId: item.id }),
    };
  }

  return {
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
    page: currentPage,
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
  };
}
