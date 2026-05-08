"use client";

import { ArrowLeft, BookOpen, ImageIcon, Quote, Volume2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    className: "border-rose-500/70 bg-rose-500/85 text-white hover:bg-rose-500 hover:text-white",
  },
  {
    rating: "hard",
    copy: "Hard",
    hint: "Remembered slowly",
    className: "border-amber-500/70 bg-amber-500/85 text-white hover:bg-amber-500 hover:text-white",
  },
  {
    rating: "good",
    copy: "Good",
    hint: "Remembered",
    className: "border-blue-500/70 bg-blue-500/85 text-white hover:bg-blue-500 hover:text-white",
  },
  {
    rating: "easy",
    copy: "Easy",
    hint: "Knew it quickly",
    className:
      "border-emerald-500/70 bg-emerald-500/85 text-white hover:bg-emerald-500 hover:text-white",
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
      <SoftGradientBackground className="fixed inset-0 z-0 h-dvh w-full overflow-hidden">
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
      <SoftGradientBackground className="fixed inset-0 z-0 h-dvh w-full overflow-hidden">
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
    <SoftGradientBackground className="fixed inset-0 z-0 h-dvh w-full overflow-hidden">
      <div className="mx-auto flex h-dvh w-full max-w-5xl flex-col gap-4 px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pt-6">
        <div className="rounded-xl border bg-background/75 p-3 shadow-sm backdrop-blur-md sm:p-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="-ml-2 gap-2 hover:bg-background/80"
            >
              <Link href={`/pack/${session.packId}`}>
                <ArrowLeft className="size-4" />
                <span className="font-medium">Exit</span>
              </Link>
            </Button>

            <div className="min-w-0 flex-1 text-center">
              <div className="truncate text-base font-semibold tracking-tight sm:text-lg">
                {session.mediaTitle}
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
                {modeLabels[session.mode]} · {session.packName}
              </div>
            </div>

            <Badge
              variant="secondary"
              className="hidden border-primary/20 bg-primary/10 font-semibold text-primary sm:inline-flex"
            >
              Card {displayIndex} of {session.cards.length}
            </Badge>
            <Badge variant="outline" className="font-semibold sm:hidden">
              {displayIndex}/{session.cards.length}
            </Badge>
          </div>

          <div className="mt-3">
            <Progress value={progressPct} className="h-1.5 bg-muted/70" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Card className="min-h-[min(500px,calc(100dvh-14rem))] max-h-full w-full max-w-4xl overflow-hidden border bg-background/95 shadow-xl shadow-primary/5 sm:min-h-[560px]">
            <CardContent className="p-0">
              <div className="group relative max-h-full w-full overflow-y-auto text-left">
                <button
                  type="button"
                  onClick={revealCard}
                  tabIndex={state.isFlipped ? -1 : 0}
                  aria-pressed={state.isFlipped}
                  aria-disabled={Boolean(state.pendingRating)}
                  aria-hidden={state.isFlipped}
                  className={
                    "flex min-h-[min(500px,calc(100dvh-14rem))] w-full flex-col items-center justify-center gap-5 border-0 bg-transparent p-6 text-inherit transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[560px] sm:p-10 " +
                    (state.isFlipped
                      ? "pointer-events-none absolute inset-0 scale-[0.98] opacity-0"
                      : "relative opacity-100")
                  }
                >
                  <div className="max-w-2xl space-y-5 text-center">
                    <div className="mx-auto flex w-fit items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                      <BookOpen className="size-3.5" />
                      Prompt
                    </div>
                    <div className="text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
                      {activeCard.displayText}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                      {activeCard.partOfSpeech ? (
                        <Badge variant="outline">{activeCard.partOfSpeech}</Badge>
                      ) : null}
                      {activeCard.cefrLevel ? (
                        <Badge variant="secondary">{activeCard.cefrLevel}</Badge>
                      ) : null}
                    </div>
                    <div className="pt-2">
                      <span className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm">
                        Reveal answer
                      </span>
                    </div>
                  </div>
                </button>

                <div
                  aria-hidden={!state.isFlipped}
                  className={
                    "flex min-h-[min(500px,calc(100dvh-14rem))] flex-col transition-all duration-300 sm:min-h-[560px] " +
                    (state.isFlipped
                      ? "relative opacity-100"
                      : "pointer-events-none absolute inset-0 opacity-0")
                  }
                >
                  <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 p-5 sm:gap-6 sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex w-fit items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                          <BookOpen className="size-3.5" />
                          Answer
                        </div>
                        <div className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                          {activeCard.displayText}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">
                            {formatVocabularyKindLabel(activeCard.kind)}
                          </Badge>
                          {activeCard.cefrLevel ? (
                            <Badge variant="secondary">{activeCard.cefrLevel}</Badge>
                          ) : null}
                        </div>
                      </div>
                      {activeCard.audioUrl ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 rounded-full"
                          tabIndex={state.isFlipped ? 0 : -1}
                          onClick={(event) => {
                            event.stopPropagation();
                            new Audio(activeCard.audioUrl ?? undefined).play();
                          }}
                        >
                          <Volume2 className="size-4" />
                          Play audio
                        </Button>
                      ) : null}
                    </div>

                    <div className="rounded-lg border bg-muted/25 p-4">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                        <BookOpen className="size-3.5" />
                        Meaning
                      </div>
                      <p className="text-base leading-relaxed text-foreground/90">
                        {activeCard.meaning ?? "No meaning has been saved for this card."}
                      </p>
                    </div>

                    {activeCard.exampleSentences.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                          <Quote className="size-3.5" />
                          {activeCard.exampleSentences.length === 1 ? "Example" : "Examples"}
                        </div>
                        <div className="space-y-3">
                          {activeCard.exampleSentences.map((example) => (
                            <div
                              key={example}
                              className="rounded-lg border bg-background/70 px-4 py-3"
                            >
                              <p className="text-sm leading-relaxed text-foreground/80">
                                &quot;{example}&quot;
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {activeCard.imageUrl ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                          <ImageIcon className="size-3.5" />
                          Visual cue
                        </div>
                        <div className="relative h-40 w-full overflow-hidden rounded-lg border bg-muted sm:h-52">
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
            </CardContent>
          </Card>
        </div>
      </div>

      <div
        className={
          "fixed inset-x-0 bottom-0 z-50 border-t bg-background/90 shadow-[0_-18px_45px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/75 " +
          (state.isFlipped ? "opacity-100" : "pointer-events-none opacity-0")
        }
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
          <div className="mx-auto w-full max-w-4xl px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {ratingOptions.map(({ rating, copy, hint, className }, index) => (
                <Button
                  key={rating}
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-10 justify-between rounded-lg px-3 text-left text-sm shadow-sm transition-transform hover:-translate-y-0.5 sm:h-11",
                    className,
                  )}
                  disabled={Boolean(state.pendingRating)}
                  onClick={() => rateCard(rating)}
                  aria-label={`${copy}. ${hint}. Keyboard shortcut ${index + 1}.`}
                  tabIndex={state.isFlipped ? 0 : -1}
                >
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="font-semibold">
                      {state.pendingRating === rating ? "Saving..." : copy}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
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
