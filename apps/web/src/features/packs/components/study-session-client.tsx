"use client";

import { ArrowLeft, Volume2 } from "lucide-react";
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
import type { PackReviewRating, StudySessionView } from "@/features/packs/types";

function clampToInt(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDueLabel(value: string | null) {
  if (!value) {
    return "No reviewed cards are scheduled yet.";
  }

  const dueAt = new Date(value);
  const diffMs = dueAt.getTime() - Date.now();
  if (diffMs <= 0) {
    return "Next card is due now.";
  }

  const minutes = Math.ceil(diffMs / (60 * 1000));
  if (minutes < 60) {
    return `Next card is due in ${minutes}m.`;
  }

  const hours = Math.ceil(minutes / 60);
  if (hours < 24) {
    return `Next card is due in ${hours}h.`;
  }

  return `Next card is due in ${Math.ceil(hours / 24)}d.`;
}

export function StudySessionClient({ session }: { session: StudySessionView }) {
  const initialIndex = Math.max(
    0,
    session.cards.findIndex((card) => card.id === session.initialCardId),
  );
  const [sessionIndex, setSessionIndex] = React.useState(initialIndex + 1);
  const [cardIndex, setCardIndex] = React.useState(initialIndex);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [pendingRating, setPendingRating] = React.useState<PackReviewRating | null>(null);
  const [reviewedCount, setReviewedCount] = React.useState(0);
  const [nextDueAt, setNextDueAt] = React.useState<string | null>(null);
  const cardStartedAtRef = React.useRef(Date.now());
  const { setOpen } = useSidebar();

  React.useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  const hasCards = session.cards.length > 0;
  const card = cardIndex < session.cards.length ? session.cards[cardIndex] : null;
  const isComplete = hasCards && cardIndex >= session.cards.length;
  const progressPct = clampToInt(
    (Math.min(sessionIndex, session.cards.length) / Math.max(1, session.cards.length)) * 100,
  );

  function advanceToNext() {
    setIsFlipped(false);
    setCardIndex((index) => index + 1);
    setSessionIndex((index) => Math.min(session.cards.length, index + 1));
    cardStartedAtRef.current = Date.now();
  }

  async function rateCard(rating: PackReviewRating) {
    if (!card || pendingRating) {
      return;
    }

    const previousCardIndex = cardIndex;
    const previousSessionIndex = sessionIndex;
    const previousReviewedCount = reviewedCount;
    const responseTimeMs = Date.now() - cardStartedAtRef.current;

    setPendingRating(rating);
    setReviewedCount((count) => count + 1);
    advanceToNext();

    const result = await ratePackItemAction({
      packId: session.packId,
      itemId: card.id,
      rating,
      responseTimeMs,
    });

    if (!result.ok) {
      setCardIndex(previousCardIndex);
      setSessionIndex(previousSessionIndex);
      setReviewedCount(previousReviewedCount);
      toast.error(result.error);
    } else {
      setNextDueAt(result.nextDueAt ?? (result.nextState === "mastered" ? null : result.dueAt));
    }

    setPendingRating(null);
  }

  if (!hasCards) {
    return (
      <SoftGradientBackground className="fixed inset-0 z-0 h-full w-full overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">No cards queued</h1>
          <p className="text-sm text-muted-foreground">
            This pack has no active cards ready for the default study queue.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              <Link href={`/pack/${session.packId}`}>Back to pack</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/decks">My decks</Link>
            </Button>
          </div>
        </div>
      </SoftGradientBackground>
    );
  }

  if (isComplete) {
    return (
      <SoftGradientBackground className="fixed inset-0 z-0 h-full w-full overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center gap-5 px-6 text-center">
          <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
            Session complete
          </Badge>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Reviews saved</h1>
            <p className="text-sm text-muted-foreground">
              {reviewedCount} {reviewedCount === 1 ? "card" : "cards"} reviewed.{" "}
              {formatDueLabel(nextDueAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              <Link href={`/pack/${session.packId}`}>Back to pack</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/decks">My decks</Link>
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
    <SoftGradientBackground className="fixed inset-0 z-0 h-full w-full overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-4 pb-28 pt-6 sm:px-6">
        <div className="mb-4 rounded-xl border bg-background/60 p-4 shadow-sm backdrop-blur-md">
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
              <div className="truncate text-base font-semibold">{session.mediaTitle}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {session.packName}
              </div>
            </div>

            <Badge
              variant="secondary"
              className="hidden border-primary/20 bg-primary/10 font-semibold text-primary sm:inline-flex"
            >
              Card {sessionIndex} of {session.cards.length}
            </Badge>
            <Badge variant="outline" className="font-semibold sm:hidden">
              {sessionIndex}/{session.cards.length}
            </Badge>
          </div>

          <div className="mt-3">
            <Progress value={progressPct} className="h-2.5" />
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <Card className="w-full overflow-hidden border-2 shadow-lg">
            <CardContent className="p-0">
              <button
                type="button"
                className="group relative w-full text-left"
                onClick={() => setIsFlipped((value) => !value)}
                aria-pressed={isFlipped}
              >
                <div
                  className={
                    "flex min-h-[520px] flex-col items-center justify-center gap-4 p-8 transition-all duration-300 " +
                    (isFlipped
                      ? "pointer-events-none absolute inset-0 scale-[0.98] opacity-0"
                      : "relative opacity-100")
                  }
                >
                  <div className="space-y-4 text-center">
                    <div className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
                      {activeCard.displayText}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                      {activeCard.partOfSpeech ? (
                        <Badge variant="outline">{activeCard.partOfSpeech}</Badge>
                      ) : null}
                      {activeCard.cefrLevel ? (
                        <Badge variant="secondary">{activeCard.cefrLevel}</Badge>
                      ) : null}
                      <span>Tap to reveal</span>
                    </div>
                  </div>
                </div>

                <div
                  className={
                    "flex min-h-[520px] flex-col gap-6 p-8 transition-all duration-300 " +
                    (isFlipped
                      ? "relative opacity-100"
                      : "pointer-events-none absolute inset-0 opacity-0")
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                    <div className="min-w-0">
                      <div className="text-2xl font-bold tracking-tight text-primary">
                        {activeCard.displayText}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{activeCard.kind.replaceAll("_", " ")}</Badge>
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
                        className="gap-1.5"
                        onClick={(event) => {
                          event.stopPropagation();
                          new Audio(activeCard.audioUrl ?? undefined).play();
                        }}
                      >
                        <Volume2 className="size-4" />
                        Play
                      </Button>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Generated meaning
                    </div>
                    <p className="text-base leading-relaxed text-foreground/90">
                      {activeCard.meaning ?? "No generated meaning was saved for this card."}
                    </p>
                  </div>

                  {activeCard.exampleSentences.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Generated{" "}
                        {activeCard.exampleSentences.length === 1 ? "example" : "examples"}
                      </div>
                      <div className="space-y-3">
                        {activeCard.exampleSentences.map((example) => (
                          <div key={example} className="border-l-2 border-primary/30 pl-3">
                            <p className="text-sm leading-relaxed italic text-foreground/80">
                              &quot;{example}&quot;
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeCard.imageUrl ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Generated image
                      </div>
                      <div className="relative h-56 w-full overflow-hidden rounded-xl border bg-muted">
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
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div
        className={
          "fixed inset-x-0 bottom-0 z-50 border-t bg-background/75 backdrop-blur supports-[backdrop-filter]:bg-background/60 " +
          (isFlipped ? "opacity-100" : "pointer-events-none opacity-0")
        }
      >
        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-2 px-4 py-4 sm:grid-cols-4 sm:gap-3 sm:px-6">
          {[
            ["again", "Again", "Retry soon", "bg-rose-600 hover:bg-rose-600/90"],
            ["hard", "Hard", "Still shaky", "bg-amber-600 hover:bg-amber-600/90"],
            ["good", "Good", "Remembered", "bg-sky-600 hover:bg-sky-600/90"],
            ["easy", "Easy", "Known well", "bg-emerald-600 hover:bg-emerald-600/90"],
          ].map(([rating, copy, hint, className]) => (
            <Button
              key={rating}
              type="button"
              className={`h-12 text-white ${className}`}
              disabled={Boolean(pendingRating)}
              onClick={() => rateCard(rating as PackReviewRating)}
            >
              <div className="flex w-full flex-col items-center leading-tight">
                <span className="font-semibold">
                  {pendingRating === rating ? "Saving..." : copy}
                </span>
                <span className="text-[11px] opacity-90">{hint}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </SoftGradientBackground>
  );
}
