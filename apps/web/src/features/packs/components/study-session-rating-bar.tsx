"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PackReviewRating } from "@/features/packs/types";
import { cn } from "@/lib/ui/cn";

const ratingOptions: {
  rating: PackReviewRating;
  copy: string;
  hint: string;
  className: string;
}[] = [
  {
    rating: "again",
    copy: "Again",
    hint: "Needs another pass",
    className:
      "border-rose-300 bg-rose-100 text-rose-700 hover:bg-rose-200 hover:border-rose-400 dark:border-rose-800/50 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-950/80",
  },
  {
    rating: "hard",
    copy: "Hard",
    hint: "Remembered slowly",
    className:
      "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200 hover:border-amber-400 dark:border-amber-800/50 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-950/80",
  },
  {
    rating: "good",
    copy: "Good",
    hint: "Remembered",
    className:
      "border-sky-300 bg-sky-100 text-sky-700 hover:bg-sky-200 hover:border-sky-400 dark:border-sky-800/50 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-950/80",
  },
  {
    rating: "easy",
    copy: "Easy",
    hint: "Knew it quickly",
    className:
      "border-teal-300 bg-teal-100 text-teal-700 hover:bg-teal-200 hover:border-teal-400 dark:border-teal-800/50 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-950/80",
  },
];

interface StudySessionRatingBarProps {
  isFlipped: boolean;
  isPreviewMode: boolean;
  pendingRating: PackReviewRating | null;
  packId: string;
  ratingPreviews: Record<PackReviewRating, string>;
  rateCard: (rating: PackReviewRating) => void;
}

export function StudySessionRatingBar({
  isFlipped,
  isPreviewMode,
  pendingRating,
  packId,
  ratingPreviews,
  rateCard,
}: StudySessionRatingBarProps) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background/70 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-500",
        isFlipped ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      {isPreviewMode ? (
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
            Preview only
          </Badge>
          <Button asChild tabIndex={isFlipped ? 0 : -1}>
            <Link href={`/pack/${packId}`}>Back to pack</Link>
          </Button>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {ratingOptions.map(({ rating, copy, hint, className }, index) => (
              <Button
                key={rating}
                type="button"
                variant="outline"
                className={cn(
                  "h-auto justify-between rounded-xl px-3.5 py-2.5 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md sm:py-3",
                  className,
                )}
                disabled={Boolean(pendingRating)}
                onClick={() => rateCard(rating)}
                aria-label={`${copy}. ${hint}. Keyboard shortcut ${index + 1}.`}
                tabIndex={isFlipped ? 0 : -1}
              >
                <span className="flex items-center gap-1.5 text-sm">
                  <kbd className="hidden rounded border border-current/30 px-1 text-[10px] font-semibold leading-none opacity-70 sm:inline-block">
                    {index + 1}
                  </kbd>
                  {pendingRating === rating ? "Saving..." : copy}
                </span>
                <span className="shrink-0 rounded-md bg-black/[0.06] px-2 py-0.5 text-[11px] tabular-nums dark:bg-white/[0.08]">
                  {pendingRating === rating ? "" : ratingPreviews[rating]}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
