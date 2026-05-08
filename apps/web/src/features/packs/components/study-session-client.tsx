"use client";

import { ArrowLeft, BookOpen, ImageIcon, Quote, Volume2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSidebar } from "@/components/ui/sidebar";
import { ratePackItemAction } from "@/features/packs/server/actions";
import type {
  PackRatingActionResult,
  PackReviewRating,
  StudySessionView,
} from "@/features/packs/types";
import { cn } from "@/lib/utils";
import { formatVocabularyKindLabel } from "@/lib/vocabulary-kind-labels";

import { clampToInt, formatDueLabel } from "./_utils";

const modeLabels: Record<StudySessionView["mode"], string> = {
  due: "Due reviews",
  new: "New cards",
  preview: "Preview",
  cram: "Free practice",
};

const ratingByKey: Record<string, PackReviewRating> = {
  "1": "again",
  "2": "hard",
  "3": "good",
  "4": "easy",
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

type StudySessionState = {
  cardIndex: number;
  isFlipped: boolean;
  pendingRating: PackReviewRating | null;
  reviewedCount: number;
  newLearnedCount: number;
  lapseCount: number;
  nextDueAt: string | null;
};

type StudySessionAction =
  | { type: "reset"; session: StudySessionView }
  | { type: "reveal" }
  | { type: "ratingStarted"; rating: PackReviewRating }
  | {
      type: "ratingSucceeded";
      card: StudySessionView["cards"][number];
      rating: PackReviewRating;
      result: Extract<PackRatingActionResult, { ok: true }>;
    }
  | { type: "ratingFailed" };

function getInitialState(session: StudySessionView): StudySessionState {
  const initialIndex = Math.max(
    0,
    session.cards.findIndex((card) => card.id === session.initialCardId),
  );

  return {
    cardIndex: initialIndex,
    isFlipped: false,
    pendingRating: null,
    reviewedCount: 0,
    newLearnedCount: 0,
    lapseCount: 0,
    nextDueAt: null,
  };
}

function studySessionReducer(
  state: StudySessionState,
  action: StudySessionAction,
): StudySessionState {
  switch (action.type) {
    case "reset":
      return getInitialState(action.session);
    case "reveal":
      return state.pendingRating || state.isFlipped ? state : { ...state, isFlipped: true };
    case "ratingStarted":
      return { ...state, pendingRating: action.rating };
    case "ratingSucceeded":
      return {
        ...state,
        cardIndex: state.cardIndex + 1,
        isFlipped: false,
        pendingRating: null,
        reviewedCount: state.reviewedCount + 1,
        newLearnedCount:
          action.card.state === "new" ? state.newLearnedCount + 1 : state.newLearnedCount,
        lapseCount: action.rating === "again" ? state.lapseCount + 1 : state.lapseCount,
        nextDueAt:
          action.result.nextDueAt ??
          (action.result.nextState === "mastered" ? null : action.result.dueAt),
      };
    case "ratingFailed":
      return { ...state, pendingRating: null };
    default:
      return state;
  }
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

/**
 * Client-side orchestrator for a study session. Handles the active study queue,
 * user rating interactions (keyboard and mouse), and completion state.
 */
export function StudySessionClient({ session }: { session: StudySessionView }) {
  const [state, dispatch] = React.useReducer(studySessionReducer, session, getInitialState);
  const cardStartedAtRef = React.useRef(Date.now());
  const submissionLockedRef = React.useRef(false);
  const { setOpen } = useSidebar();

  React.useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  React.useEffect(() => {
    submissionLockedRef.current = false;
    cardStartedAtRef.current = Date.now();
    dispatch({ type: "reset", session });
  }, [session]);

  const hasCards = session.cards.length > 0;
  const card = state.cardIndex < session.cards.length ? session.cards[state.cardIndex] : null;
  const isComplete = hasCards && state.cardIndex >= session.cards.length;
  const isPreviewMode = session.mode === "preview";
  const displayIndex = Math.min(state.cardIndex + 1, session.cards.length);
  const progressPct = clampToInt((displayIndex / Math.max(1, session.cards.length)) * 100);

  const revealCard = React.useCallback(() => {
    dispatch({ type: "reveal" });
  }, []);

  const rateCard = React.useCallback(
    async (rating: PackReviewRating) => {
      if (
        !card ||
        isPreviewMode ||
        !state.isFlipped ||
        state.pendingRating ||
        submissionLockedRef.current
      ) {
        return;
      }

      submissionLockedRef.current = true;
      const ratedCard = card;
      const responseTimeMs = Date.now() - cardStartedAtRef.current;

      dispatch({ type: "ratingStarted", rating });

      try {
        const result = await ratePackItemAction({
          packId: session.packId,
          itemId: ratedCard.id,
          rating,
          responseTimeMs,
        });

        if (!result.ok) {
          dispatch({ type: "ratingFailed" });
          toast.error(result.error);
          return;
        }

        dispatch({ type: "ratingSucceeded", card: ratedCard, rating, result });
        cardStartedAtRef.current = Date.now();
      } finally {
        submissionLockedRef.current = false;
      }
    },
    [card, isPreviewMode, session.packId, state.isFlipped, state.pendingRating],
  );

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.repeat ||
        state.pendingRating ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      if ((event.key === " " || event.key === "Enter") && card && !state.isFlipped) {
        event.preventDefault();
        revealCard();
        return;
      }

      if (!card || !state.isFlipped || isPreviewMode) {
        return;
      }

      const rating = ratingByKey[event.key];
      if (!rating) {
        return;
      }

      event.preventDefault();
      void rateCard(rating);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [card, isPreviewMode, rateCard, revealCard, state.isFlipped, state.pendingRating]);

  if (!hasCards) {
    return (
      <SoftGradientBackground className="relative z-0 h-dvh w-full overflow-hidden">
        <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 py-[calc(1.5rem+env(safe-area-inset-bottom))] text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Nothing to study right now</h1>
          <p className="text-sm text-muted-foreground">
            No cards are available for this study mode.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              <Link href={`/pack/${session.packId}`}>Back to pack</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/decks">Decks</Link>
            </Button>
          </div>
        </div>
      </SoftGradientBackground>
    );
  }

  if (isComplete) {
    return (
      <SoftGradientBackground className="relative z-0 h-dvh w-full overflow-hidden">
        <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-5 px-6 py-[calc(1.5rem+env(safe-area-inset-bottom))] text-center">
          <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
            Session complete
          </Badge>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Study session saved</h1>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-4">
              <span>{state.reviewedCount} reviewed</span>
              <span>{state.newLearnedCount} new</span>
              <span>{state.lapseCount} lapses</span>
              <span>{formatDueLabel(state.nextDueAt)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {session.mode === "due" && session.newCardsRemainingToday > 0 ? (
              <Button asChild>
                <Link href={`/study/${session.packId}?mode=new`}>Continue with new cards</Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href={`/pack/${session.packId}`}>Back to pack</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/decks">Decks</Link>
            </Button>
          </div>
        </div>
      </SoftGradientBackground>
    );
  }

  const activeCard = card;
  if (!activeCard) {
    return null;
  }

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
            <Link href={`/pack/${session.packId}`}>
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Exit</span>
            </Link>
          </Button>

          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-sm font-semibold tracking-tight sm:text-base">
              {session.mediaTitle}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {modeLabels[session.mode]} &middot; {session.packName}
            </div>
          </div>

          <Badge
            variant="secondary"
            className="hidden border-primary/15 bg-primary/8 font-semibold tabular-nums text-primary sm:inline-flex"
          >
            {displayIndex} / {session.cards.length}
          </Badge>
          <Badge
            variant="secondary"
            className="border-primary/15 bg-primary/8 font-semibold tabular-nums text-primary sm:hidden"
          >
            {displayIndex}/{session.cards.length}
          </Badge>
        </div>
        <Progress value={progressPct} className="h-[3px] rounded-none bg-muted/50" />
      </header>

      {/* ── Card area ───────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pt-6">
        <div className="relative h-full max-h-[32rem] w-full max-w-[52rem] sm:max-h-[34rem]">
          {/* Prompt side */}
          <button
            type="button"
            onClick={revealCard}
            tabIndex={state.isFlipped ? -1 : 0}
            aria-pressed={state.isFlipped}
            aria-disabled={Boolean(state.pendingRating)}
            aria-hidden={state.isFlipped}
            className={cn(
              "flex h-full w-full flex-col items-center justify-center rounded-2xl border border-border/50 bg-background/95 px-8 text-center shadow-lg shadow-primary/[0.04] backdrop-blur-sm transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-12",
              state.isFlipped
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
                {activeCard.displayText}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {activeCard.partOfSpeech ? (
                  <Badge variant="outline" className="font-normal">
                    {activeCard.partOfSpeech}
                  </Badge>
                ) : null}
                {activeCard.cefrLevel ? (
                  <Badge variant="secondary" className="font-normal">
                    {activeCard.cefrLevel}
                  </Badge>
                ) : null}
              </div>
              <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3.5 py-1.5 text-xs tracking-wide text-muted-foreground/70">
                <span className="inline-block size-1.5 rounded-full bg-primary/40" />
                Tap to reveal
              </span>
            </div>
          </button>

          {/* Answer side */}
          <div
            aria-hidden={!state.isFlipped}
            className={cn(
              "absolute inset-0 flex flex-col overflow-y-auto rounded-2xl border border-border/50 bg-background/95 shadow-lg shadow-primary/[0.04] backdrop-blur-sm transition-all duration-500 ease-out",
              state.isFlipped
                ? "scale-100 opacity-100"
                : "pointer-events-none scale-[1.02] opacity-0",
            )}
          >
            {/* Decorative accent line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
            {/* Answer header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/40 px-6 py-5 sm:px-8">
              <div className="min-w-0 space-y-1">
                <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {activeCard.displayText}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="font-normal">
                    {formatVocabularyKindLabel(activeCard.kind)}
                  </Badge>
                  {activeCard.cefrLevel ? (
                    <Badge variant="secondary" className="font-normal">
                      {activeCard.cefrLevel}
                    </Badge>
                  ) : null}
                </div>
              </div>
              {activeCard.audioUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                  tabIndex={state.isFlipped ? 0 : -1}
                  onClick={(event) => {
                    event.stopPropagation();
                    new Audio(activeCard.audioUrl ?? undefined).play();
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
                  {activeCard.meaning ?? "No meaning has been saved for this card."}
                </p>
              </div>

              {/* Examples */}
              {activeCard.exampleSentences.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    <Quote className="size-3" />
                    {activeCard.exampleSentences.length === 1 ? "Example" : "Examples"}
                  </div>
                  <div className="space-y-2.5">
                    {activeCard.exampleSentences.map((example) => (
                      <div
                        key={example}
                        className="rounded-lg border-l-2 border-primary/20 bg-muted/30 py-2.5 pl-4 pr-3"
                      >
                        <p className="text-sm italic leading-relaxed text-foreground/70">
                          &ldquo;{example}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Image */}
              {activeCard.imageUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    <ImageIcon className="size-3" />
                    Visual cue
                  </div>
                  <div className="relative h-40 w-full overflow-hidden rounded-xl bg-muted sm:h-52">
                    <Image
                      src={activeCard.imageUrl}
                      alt={`Generated image for ${activeCard.displayText}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-cover"
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
          state.isFlipped
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        {isPreviewMode ? (
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
              Preview only
            </Badge>
            <Button asChild tabIndex={state.isFlipped ? 0 : -1}>
              <Link href={`/pack/${session.packId}`}>Back to pack</Link>
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
                  disabled={Boolean(state.pendingRating)}
                  onClick={() => rateCard(rating)}
                  aria-label={`${copy}. ${hint}. Keyboard shortcut ${index + 1}.`}
                  tabIndex={state.isFlipped ? 0 : -1}
                >
                  <span className="text-sm">
                    {state.pendingRating === rating ? "Saving..." : copy}
                  </span>
                  <span className="shrink-0 rounded-md bg-black/[0.06] px-2 py-0.5 text-[11px] tabular-nums dark:bg-white/[0.08]">
                    {state.pendingRating === rating ? "" : activeCard.ratingPreviews[rating]}
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
