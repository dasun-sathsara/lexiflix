"use client";

import { ArrowLeft, BookOpen, ImageIcon, Quote, Volume2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { PackReviewRating, StudySessionView } from "@/features/packs/types";
import { formatVocabularyKindLabel } from "@/lib/domain/vocabulary";
import { cn } from "@/lib/ui/cn";

const modeLabels: Record<StudySessionView["mode"], string> = {
  due: "Due reviews",
  new: "New cards",
  preview: "Preview",
  cram: "Free practice",
};

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

interface StudySessionCardProps {
  card: StudySessionView["cards"][number];
  isFlipped: boolean;
  pendingRating: PackReviewRating | null;
  displayIndex: number;
  cardsCount: number;
  progressPct: number;
  packId: string;
  mediaTitle: string;
  mode: StudySessionView["mode"];
  packName: string;
  revealCard: () => void;
  rateCard: (rating: PackReviewRating) => void;
}

export function StudySessionCard({
  card,
  isFlipped,
  pendingRating,
  displayIndex,
  cardsCount,
  progressPct,
  packId,
  mediaTitle,
  mode,
  packName,
  revealCard,
  rateCard,
}: StudySessionCardProps) {
  const isPreviewMode = mode === "preview";

  return (
    <SoftGradientBackground className="relative z-0 h-dvh w-full overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="relative z-20 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:h-16 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="-ml-1.5 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Link href={`/pack/${packId}`}>
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Exit</span>
            </Link>
          </Button>

          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-sm font-semibold tracking-tight sm:text-base">
              {mediaTitle}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {modeLabels[mode]} &middot; {packName}
            </div>
          </div>

          <Badge
            variant="secondary"
            className="hidden border-primary/15 bg-primary/8 font-semibold tabular-nums text-primary sm:inline-flex"
          >
            {displayIndex} / {cardsCount}
          </Badge>
          <Badge
            variant="secondary"
            className="border-primary/15 bg-primary/8 font-semibold tabular-nums text-primary sm:hidden"
          >
            {displayIndex}/{cardsCount}
          </Badge>
        </div>
        <Progress value={progressPct} className="h-[3px] rounded-none bg-muted/50" />
      </header>

      {/* ── Card area ───────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pt-6">
        <div className="relative h-full max-h-[32rem] w-full max-w-[52rem] sm:max-h-[34rem]">
          {/* Prompt side */}
          {/* biome-ignore lint/a11y/useSemanticElements: Needs to wrap nested interactive elements */}
          <div
            role="button"
            onClick={revealCard}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                revealCard();
              }
            }}
            tabIndex={isFlipped ? -1 : 0}
            aria-pressed={isFlipped}
            aria-disabled={Boolean(pendingRating)}
            aria-hidden={isFlipped}
            className={cn(
              "flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-border/50 bg-background/95 px-8 text-center shadow-lg shadow-primary/[0.04] backdrop-blur-sm transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-12",
              isFlipped
                ? "pointer-events-none absolute inset-0 scale-[0.97] opacity-0"
                : "relative scale-100 opacity-100",
            )}
          >
            {/* Decorative accent line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            {/* Subtle dot pattern */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(#94a3b810_1px,_transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#1f293730_1px,_transparent_1px)]" />
            <div className="relative flex flex-col items-center gap-4">
              <span className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {card.displayText}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {card.partOfSpeech ? (
                  <Badge variant="outline" className="font-normal capitalize">
                    {card.partOfSpeech}
                  </Badge>
                ) : null}
                {card.cefrLevel ? (
                  <Badge variant="secondary" className="font-normal">
                    {card.cefrLevel}
                  </Badge>
                ) : null}
              </div>

              {card.audioUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Play pronunciation"
                  className="mt-2 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    new Audio(card.audioUrl ?? undefined).play();
                  }}
                >
                  <Volume2 className="size-4" />
                </Button>
              ) : null}

              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3.5 py-1.5 text-xs tracking-wide text-muted-foreground/70">
                <span className="inline-block size-1.5 rounded-full bg-primary/40" />
                Query memory & tap to reveal
              </span>
            </div>
          </div>

          {/* Answer side */}
          <div
            aria-hidden={!isFlipped}
            className={cn(
              "absolute inset-0 flex flex-col overflow-y-auto rounded-2xl border border-border/50 bg-background/95 shadow-lg shadow-primary/[0.04] backdrop-blur-sm transition-all duration-500 ease-out",
              isFlipped ? "scale-100 opacity-100" : "pointer-events-none scale-[1.02] opacity-0",
            )}
          >
            {/* Decorative accent line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
            {/* Answer header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/40 px-6 py-5 sm:px-8">
              <div className="min-w-0 space-y-1">
                <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {card.displayText}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="font-normal">
                    {formatVocabularyKindLabel(card.kind)}
                  </Badge>
                  {card.cefrLevel ? (
                    <Badge variant="secondary" className="font-normal">
                      {card.cefrLevel}
                    </Badge>
                  ) : null}
                </div>
              </div>
              {card.audioUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                  tabIndex={isFlipped ? 0 : -1}
                  onClick={(event) => {
                    event.stopPropagation();
                    new Audio(card.audioUrl ?? undefined).play();
                  }}
                >
                  <Volume2 className="size-4" />
                </Button>
              ) : null}
            </div>

            {/* Answer content */}
            <div className="flex-1 space-y-5 px-6 py-5 sm:space-y-6 sm:px-8">
              {/* Meaning */}
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  <BookOpen className="size-3" />
                  Meaning
                </div>
                <p className="text-[15px] leading-relaxed text-foreground/85 sm:text-base">
                  {card.meaning ?? "No meaning has been saved for this card."}
                </p>
              </div>

              {/* Examples */}
              {card.exampleSentences.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    <Quote className="size-3" />
                    {card.exampleSentences.length === 1 ? "Example" : "Examples"}
                  </div>
                  <div className="space-y-2.5">
                    {card.exampleSentences.map((example, index) => (
                      <div
                        key={example}
                        className="flex items-start gap-2 rounded-lg border-l-2 border-primary/20 bg-muted/30 py-2.5 pl-4 pr-3"
                      >
                        <p className="min-w-0 flex-1 text-sm italic leading-relaxed text-foreground/70">
                          &ldquo;{example}&rdquo;
                        </p>
                        {card.exampleSentenceAudioUrls[index] ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Play example sentence"
                            className="size-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                            tabIndex={isFlipped ? 0 : -1}
                            onClick={(event) => {
                              event.stopPropagation();
                              new Audio(card.exampleSentenceAudioUrls[index] ?? undefined).play();
                            }}
                          >
                            <Volume2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Image */}
              {card.imageUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    <ImageIcon className="size-3" />
                    Visual cue
                  </div>
                  <div className="relative h-40 w-full overflow-hidden rounded-xl bg-muted sm:h-52">
                    <Image
                      src={card.imageUrl}
                      alt={`Generated image for ${card.displayText}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ── Rating bar ──────────────────────────────────────── */}
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
                    {pendingRating === rating ? "" : card.ratingPreviews[rating]}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </SoftGradientBackground>
  );
}
