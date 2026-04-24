"use client";

import { ArrowLeft, Volume2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSidebar } from "@/components/ui/sidebar";
import type { StudySessionView } from "@/features/packs/types";

function clampToInt(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function StudySessionClient({ session }: { session: StudySessionView }) {
  const initialIndex = Math.max(
    0,
    session.cards.findIndex((card) => card.id === session.initialCardId),
  );
  const [sessionIndex, setSessionIndex] = React.useState(initialIndex + 1);
  const [cardIndex, setCardIndex] = React.useState(initialIndex);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const { setOpen } = useSidebar();

  React.useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  const card = session.cards[cardIndex];
  const progressPct = clampToInt((sessionIndex / Math.max(1, session.cards.length)) * 100);

  function goNext() {
    setIsFlipped(false);
    setCardIndex((index) => (index + 1) % session.cards.length);
    setSessionIndex((index) => (index >= session.cards.length ? 1 : index + 1));
  }

  if (!card) {
    return (
      <SoftGradientBackground className="fixed inset-0 z-0 h-full w-full overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">No active cards</h1>
          <p className="text-sm text-muted-foreground">
            This pack has no active cards to study. Reset the pack to restore removed cards.
          </p>
          <Button asChild>
            <Link href={`/pack/${session.packId}`}>Back to pack</Link>
          </Button>
        </div>
      </SoftGradientBackground>
    );
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
                      {card.displayText}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                      {card.partOfSpeech ? (
                        <Badge variant="outline">{card.partOfSpeech}</Badge>
                      ) : null}
                      {card.cefrLevel ? <Badge variant="secondary">{card.cefrLevel}</Badge> : null}
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
                        {card.displayText}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{card.kind.replaceAll("_", " ")}</Badge>
                        {card.cefrLevel ? (
                          <Badge variant="secondary">{card.cefrLevel}</Badge>
                        ) : null}
                      </div>
                    </div>
                    {card.audioUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={(event) => {
                          event.stopPropagation();
                          new Audio(card.audioUrl ?? undefined).play();
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
                      {card.meaning ?? "No generated meaning was saved for this card."}
                    </p>
                  </div>

                  {card.exampleSentences.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Generated {card.exampleSentences.length === 1 ? "example" : "examples"}
                      </div>
                      <div className="space-y-3">
                        {card.exampleSentences.map((example) => (
                          <div key={example} className="border-l-2 border-primary/30 pl-3">
                            <p className="text-sm leading-relaxed italic text-foreground/80">
                              &quot;{example}&quot;
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {card.imageUrl ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        Generated image
                      </div>
                      <div className="relative h-56 w-full overflow-hidden rounded-xl border bg-muted">
                        <Image
                          src={card.imageUrl}
                          alt={`Generated image for ${card.displayText}`}
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
            ["again", "< 1m", "Again", "bg-rose-600 hover:bg-rose-600/90"],
            ["hard", "10m", "Hard", "bg-amber-600 hover:bg-amber-600/90"],
            ["good", "2d", "Good", "bg-sky-600 hover:bg-sky-600/90"],
            ["easy", "4d", "Easy", "bg-emerald-600 hover:bg-emerald-600/90"],
          ].map(([rating, timing, copy, className]) => (
            <Button
              key={rating}
              type="button"
              className={`h-12 text-white ${className}`}
              onClick={goNext}
            >
              <div className="flex w-full flex-col items-center leading-tight">
                <span className="text-[11px] opacity-90">{timing}</span>
                <span className="font-semibold">{copy}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </SoftGradientBackground>
  );
}
