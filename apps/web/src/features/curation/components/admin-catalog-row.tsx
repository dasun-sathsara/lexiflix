"use client";

import { Film, Loader2, RotateCcw, Trash2, Tv } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";

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
import type { CuratedCatalogEntry } from "@/features/curation/lib/types";
import {
  deleteCuratedEntryAction,
  refreshCuratedEntryAction,
  saveCuratedEntryFeaturedRankAction,
  setCuratedEntryPublishedAction,
} from "@/features/curation/server/actions";
import { IMAGE_BASE_URL, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

interface AdminCatalogRowProps {
  entry: CuratedCatalogEntry;
}

export function AdminCatalogRow({ entry }: AdminCatalogRowProps) {
  const [isPending, startTransition] = useTransition();

  const [rankValue, setRankValue] = useState<string>(
    entry.featuredRank != null ? String(entry.featuredRank) : "",
  );
  const [rankDirty, setRankDirty] = useState(false);
  const rankInputRef = useRef<HTMLInputElement>(null);

  const posterUrl = entry.posterPath
    ? `${IMAGE_BASE_URL}${TMDB_IMAGE_SIZES.poster.sm}${entry.posterPath}`
    : null;

  const year = entry.releaseDate ? entry.releaseDate.slice(0, 4) : null;
  const voteAvg =
    entry.voteAverage && Number.isFinite(Number.parseFloat(entry.voteAverage))
      ? Number.parseFloat(entry.voteAverage).toFixed(1)
      : null;

  function handleRankBlur() {
    if (!rankDirty) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", entry.id);
      fd.set("featuredRank", rankValue);
      await saveCuratedEntryFeaturedRankAction(fd);
      setRankDirty(false);
    });
  }

  function handleRankKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
    if (e.key === "Escape") {
      setRankValue(entry.featuredRank != null ? String(entry.featuredRank) : "");
      setRankDirty(false);
      e.currentTarget.blur();
    }
  }

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
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", entry.id);
      await deleteCuratedEntryAction(fd);
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card/40 px-3 py-2.5 transition-all hover:bg-card/60 hover:shadow-sm",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      {/* Poster thumbnail */}
      <div className="relative h-[54px] w-9 shrink-0 overflow-hidden rounded-lg border bg-muted">
        {posterUrl ? (
          <Image src={posterUrl} alt={entry.title} fill className="object-cover" sizes="36px" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {entry.mediaType === "tv" ? <Tv className="size-3.5" /> : <Film className="size-3.5" />}
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="min-w-0 flex-1">
        {/* Title row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium">{entry.title}</p>
          <span className="shrink-0 text-xs text-muted-foreground">#{entry.tmdbId}</span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground">
            {entry.mediaType === "tv" ? <Tv className="size-3" /> : <Film className="size-3" />}
            {entry.mediaType === "tv" ? "TV" : "Movie"}
          </span>
        </div>

        {/* Meta row */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {year && <span>{year}</span>}
          {voteAvg && <span>★ {voteAvg}</span>}
          {entry.contentRating && (
            <span className="rounded border border-border/60 px-1 py-px text-[10px]">
              {entry.contentRating}
            </span>
          )}
          {entry.genres.slice(0, 2).map((g) => (
            <Badge key={g.id} variant="secondary" className="h-4 rounded-sm px-1.5 text-[10px]">
              {g.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Featured rank input */}
        <div className="flex items-center gap-1.5">
          <label htmlFor={`rank-${entry.id}`} className="shrink-0 text-xs text-muted-foreground">
            Rank
          </label>
          <input
            ref={rankInputRef}
            id={`rank-${entry.id}`}
            type="number"
            min={1}
            max={999}
            value={rankValue}
            onChange={(e) => {
              setRankValue(e.target.value);
              setRankDirty(true);
            }}
            onBlur={handleRankBlur}
            onKeyDown={handleRankKeyDown}
            placeholder="—"
            disabled={isPending}
            className={cn(
              "h-7 w-16 rounded-md border bg-background px-2 text-xs tabular-nums",
              "focus:outline-none focus:ring-1 focus:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              rankDirty &&
                "border-amber-400/70 bg-amber-50/50 ring-amber-300/40 dark:bg-amber-950/20",
            )}
          />
        </div>

        {/* Published toggle */}
        <button
          type="button"
          onClick={handleTogglePublished}
          disabled={isPending}
          title={entry.isPublished ? "Click to hide" : "Click to publish"}
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-50",
            entry.isPublished
              ? "border-emerald-200/60 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
              : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {entry.isPublished ? "Published" : "Hidden"}
        </button>

        {/* Refresh button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          disabled={isPending}
          onClick={handleRefresh}
          title="Refresh snapshot from TMDB"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          <span className="sr-only">Refresh from TMDB</span>
        </Button>

        {/* Delete button + confirmation dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              disabled={isPending}
              title="Delete entry"
            >
              <Trash2 className="size-3.5" />
              <span className="sr-only">Delete entry</span>
            </Button>
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
    </div>
  );
}
