"use client";

import { Reorder, useDragControls } from "motion/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import type { CuratedCatalogEntry } from "@/features/curation/lib/types";
import { reorderCuratedEntriesAction } from "@/features/curation/server/actions";

import { AdminCatalogRow } from "./admin-catalog-row";

interface AdminCatalogListProps {
  entries: CuratedCatalogEntry[];
  draggable: boolean;
}

function SortableCatalogRow({ entry }: { entry: CuratedCatalogEntry }) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={entry}
      dragListener={false}
      dragControls={dragControls}
      as="div"
      className="bg-card"
      whileDrag={{
        scale: 1.005,
        boxShadow: "0 20px 48px -12px rgba(15, 23, 42, 0.28)",
        zIndex: 10,
      }}
      transition={{ duration: 0.18 }}
    >
      <AdminCatalogRow
        entry={entry}
        onDragHandlePointerDown={(event) => dragControls.start(event)}
      />
    </Reorder.Item>
  );
}

/**
 * Admin catalog list. When `draggable` is true, renders rows inside a
 * `Reorder.Group` and persists the new order via a server action.
 */
export function AdminCatalogList({ entries, draggable }: AdminCatalogListProps) {
  const [items, setItems] = useState(entries);
  const [, startTransition] = useTransition();
  const pendingOrder = useRef<string[] | null>(null);

  // Keep local state in sync when the server sends a fresh list, but not
  // while we're mid-reorder (to avoid clobbering the optimistic update).
  useEffect(() => {
    if (pendingOrder.current) {
      const current = pendingOrder.current;
      const next = entries.map((e) => e.id);
      const same = current.length === next.length && current.every((id, idx) => id === next[idx]);
      if (same) {
        pendingOrder.current = null;
      }
    }
    if (!pendingOrder.current) {
      setItems(entries);
    }
  }, [entries]);

  if (!draggable) {
    return (
      <div className="divide-y divide-border/60">
        {entries.map((entry) => (
          <AdminCatalogRow key={entry.id} entry={entry} />
        ))}
      </div>
    );
  }

  function handleReorder(next: CuratedCatalogEntry[]) {
    setItems(next);
  }

  function persistCurrentOrder() {
    const ids = items.map((item) => item.id);
    const original = entries.map((entry) => entry.id);
    const unchanged =
      ids.length === original.length && ids.every((id, idx) => id === original[idx]);
    if (unchanged) return;

    pendingOrder.current = ids;
    startTransition(async () => {
      const result = await reorderCuratedEntriesAction({ ids });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save new order.");
        pendingOrder.current = null;
        setItems(entries);
      }
    });
  }

  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={handleReorder}
      as="div"
      className="divide-y divide-border/60"
    >
      {items.map((entry) => (
        <div key={entry.id} onPointerUp={persistCurrentOrder}>
          <SortableCatalogRow entry={entry} />
        </div>
      ))}
    </Reorder.Group>
  );
}
