"use client";

import * as React from "react";
import { toast } from "sonner";

import { useSidebar } from "@/components/ui/sidebar";
import { ratePackItemAction } from "@/features/packs/server/actions";
import type {
  PackRatingActionResult,
  PackReviewRating,
  StudySessionView,
} from "@/features/packs/types";
import { clampToInt } from "@/lib/primitives/numbers";
import { StudySessionCard } from "./study-session-card";
import { StudySessionComplete } from "./study-session-complete";
import { StudySessionEmpty } from "./study-session-empty";

const ratingByKey: Record<string, PackReviewRating> = {
  "1": "again",
  "2": "hard",
  "3": "good",
  "4": "easy",
};

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
          action.result.data.nextDueAt ??
          (action.result.data.nextState === "mastered" ? null : action.result.data.dueAt),
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
  const sessionStartedAtRef = React.useRef(Date.now());
  const submissionLockedRef = React.useRef(false);
  const { setOpen } = useSidebar();

  React.useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  // Rating a card triggers a Server Action, which always re-renders this route
  // and hands us a freshly-built `session` whose queue no longer contains the
  // rated card. Reading that live prop would reset the count on every rating.
  // We pin the queue snapshot for the lifetime of a session identity
  // (pack + mode) and progress purely through local state instead.
  const sessionKey = `${session.packId}:${session.mode}`;
  const snapshotRef = React.useRef({ key: sessionKey, cards: session.cards });
  if (snapshotRef.current.key !== sessionKey) {
    snapshotRef.current = { key: sessionKey, cards: session.cards };
  }
  const cards = snapshotRef.current.cards;

  const lastSessionKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (lastSessionKeyRef.current === sessionKey) {
      return;
    }
    lastSessionKeyRef.current = sessionKey;
    submissionLockedRef.current = false;
    cardStartedAtRef.current = Date.now();
    sessionStartedAtRef.current = Date.now();
    dispatch({ type: "reset", session });
  }, [sessionKey, session]);

  const hasCards = cards.length > 0;
  const card = state.cardIndex < cards.length ? cards[state.cardIndex] : null;
  const isComplete = hasCards && state.cardIndex >= cards.length;
  const isPreviewMode = session.mode === "preview";
  const displayIndex = Math.min(state.cardIndex + 1, cards.length);
  const progressPct = clampToInt((displayIndex / Math.max(1, cards.length)) * 100);

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
    return <StudySessionEmpty packId={session.packId} />;
  }

  if (isComplete) {
    return (
      <StudySessionComplete
        reviewedCount={state.reviewedCount}
        newLearnedCount={state.newLearnedCount}
        lapseCount={state.lapseCount}
        nextDueAt={state.nextDueAt}
        elapsedTimeMs={Date.now() - sessionStartedAtRef.current}
        mode={session.mode}
        newCardsRemainingToday={session.newCardsRemainingToday}
        packId={session.packId}
      />
    );
  }

  const activeCard = card;
  if (!activeCard) {
    return null;
  }

  return (
    <StudySessionCard
      card={activeCard}
      isFlipped={state.isFlipped}
      pendingRating={state.pendingRating}
      displayIndex={displayIndex}
      cardsCount={cards.length}
      progressPct={progressPct}
      packId={session.packId}
      mediaTitle={session.mediaTitle}
      mode={session.mode}
      packName={session.packName}
      revealCard={revealCard}
      rateCard={rateCard}
    />
  );
}
