"use client";

import { Film, GripVertical, Loader2, MoreHorizontal, RotateCcw, Trash2, Tv } from "lucide-react";
import Image from "next/image";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useState, useTransition } from "react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CuratedCatalogEntry } from "@/features/curation/lib/types";
import {
  deleteCuratedEntryAction,
  refreshCuratedEntryAction,
  setCuratedEntryPublishedAction,
} from "@/features/curation/server/actions";
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

interface AdminCatalogRowProps {
  entry: CuratedCatalogEntry;
  onDragHandlePointerDown?: (event: ReactPointerEvent) => void;
}

export function AdminCatalogRow({ entry, onDragHandlePointerDown }: AdminCatalogRowProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const posterUrl = buildTmdbImageUrl(entry.posterPath, TMDB_IMAGE_SIZES.poster.sm);
  const year = entry.releaseDate ? entry.releaseDate.slice(0, 4) : null;
  const voteAvg =
    entry.voteAverage && Number.isFinite(Number.parseFloat(entry.voteAverage))
      ? Number.parseFloat(entry.voteAverage).toFixed(1)
      : null;
  const TypeIcon = entry.mediaType === "tv" ? Tv : Film;
  const isDraggable = Boolean(onDragHandlePointerDown);

  function handleTogglePublished() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", entry.id);
      fd.set("isPublished", entry.isPublished ? "false" : "true");
      await setCuratedEntryPublishedAction(fd);
    });
  }

  function handleRefresh() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mediaType", entry.mediaType);
      fd.set("tmdbId", String(entry.tmdbId));
      await refreshCuratedEntryAction(fd);
    });
  }

  function handleDelete() {
    setDeleteOpen(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", entry.id);
      await deleteCuratedEntryAction(fd);
    });
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      {/* Drag handle */}
      {isDraggable ? (
        <button
          type="button"
          aria-label={`Reorder ${entry.title}`}
          className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
          onPointerDown={(event) => {
            event.preventDefault();
            onDragHandlePointerDown?.(event);
          }}
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}

      {/* Poster */}
      <div className="relative h-[54px] w-[36px] shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/60">
        {posterUrl ? (
          <Image src={posterUrl} alt={entry.title} fill className="object-cover" sizes="36px" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/50">
            <TypeIcon className="size-4" />
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold tracking-tight">{entry.title}</p>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50">
            #{entry.tmdbId}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <TypeIcon className="size-3" />
            {entry.mediaType === "tv" ? "TV" : "Movie"}
          </span>
          {year ? (
            <>
              <span className="text-border">·</span>
              <span className="tabular-nums">{year}</span>
            </>
          ) : null}
          {voteAvg ? (
            <>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-0.5 tabular-nums">
                <span className="text-amber-500">★</span>
                {voteAvg}
              </span>
            </>
          ) : null}
          {entry.contentRating ? (
            <>
              <span className="text-border">·</span>
              <span className="rounded border border-border/70 px-1 py-px text-[10px] font-semibold uppercase tracking-wider">
                {entry.contentRating}
              </span>
            </>
          ) : null}
          {entry.genres.length > 0 ? (
            <>
              <span className="text-border">·</span>
              <span className="truncate">
                {entry.genres
                  .slice(0, 3)
                  .map((g) => g.name)
                  .join(", ")}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Published toggle */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleTogglePublished}
        disabled={isPending}
        className={cn(
          "h-7 shrink-0 gap-1.5 rounded-md border px-2.5 text-xs font-medium",
          entry.isPublished
            ? "border-emerald-200/70 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300"
            : "border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            entry.isPublished ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
        />
        {entry.isPublished ? "Published" : "Hidden"}
      </Button>

      {/* Overflow menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isPending}
            className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
            <span className="sr-only">Row actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          <DropdownMenuItem className="text-xs" onClick={handleRefresh}>
            <RotateCcw className="size-3.5" />
            Refresh from TMDB
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-xs"
            variant="destructive"
            onSelect={(event) => {
              event.preventDefault();
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger className="sr-only" aria-hidden="true">
          Delete {entry.title}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete catalog entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <strong className="text-foreground">{entry.title}</strong> from the curated catalog.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
