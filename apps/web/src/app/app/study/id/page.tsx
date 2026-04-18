"use client";

import { ArrowLeft, Volume2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSidebar } from "@/components/ui/sidebar";

type Flashcard = {
  id: string;
  term: string;
  ipa: string;
  definition: string;
  context: string;
  examples: string[];
  contextImageLabel?: string; // Optional - not all cards have images
};

const FLASHCARDS: Flashcard[] = [
  {
    id: "relativity",
    term: "Relativity",
    ipa: "/ˌrɛləˈtɪvɪti/",
    definition:
      "A principle in physics describing how measurements of time and space depend on the observer's motion and the gravitational field.",
    context: "Relativity dictates that time moves slower here than it does on Earth.",
    examples: [
      "Einstein's theory of relativity revolutionized our understanding of space and time.",
      "The concept of relativity shows that measurements can vary depending on the observer's frame of reference.",
    ],
    contextImageLabel: "A warped clock face near a planet.",
  },
  {
    id: "rendezvous",
    term: "Rendezvous",
    ipa: "/ˈrɒndɪvuː/",
    definition:
      "A planned meeting at a specific time and place; in spaceflight, the act of two spacecraft meeting and potentially docking.",
    context: "We'll rendezvous with the station at the edge of the gravity well.",
    examples: ["The two spacecraft will rendezvous in orbit before beginning their joint mission."],
    // No context image for this card
  },
  {
    id: "calibrate",
    term: "Calibrate",
    ipa: "/ˈkælɪbreɪt/",
    definition:
      "To adjust an instrument or system carefully so it produces accurate results; to fine-tune settings.",
    context: "Calibrate the sensors again—something's off with the readings.",
    examples: [
      "The technician needs to calibrate the equipment before we can begin the experiment.",
      "We must calibrate our instruments to account for the extreme conditions.",
    ],
    contextImageLabel: "A control panel with precision dials.",
  },
];

function clampToInt(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const packId = id;

  const sessionTotal = 20;
  const [sessionIndex, setSessionIndex] = React.useState(1);
  const [cardIndex, setCardIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);

  const { setOpen } = useSidebar();

  // Collapse sidebar when entering flashcard mode
  React.useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  const card = FLASHCARDS[cardIndex];
  const progressPct = clampToInt((sessionIndex / Math.max(1, sessionTotal)) * 100);

  function goNext(rating: "again" | "hard" | "good" | "easy") {
    // Mock interaction only.
    console.log("SRS rating", { rating, cardId: card.id, packId });

    setIsFlipped(false);
    setCardIndex((i) => (i + 1) % FLASHCARDS.length);
    setSessionIndex((i) => (i >= sessionTotal ? 1 : i + 1));
  }

  return (
    <SoftGradientBackground className="fixed inset-0 z-0 h-full w-full overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-4 pb-28 pt-6 sm:px-6">
        {/* Focus mode header */}
        <div className="mb-4 rounded-xl bg-background/60 backdrop-blur-md border shadow-sm p-4">
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" size="sm" asChild className="-ml-2 hover:bg-background/80">
              <Link href="/decks" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="font-medium">Exit</span>
              </Link>
            </Button>

            <div className="min-w-0 text-center flex-1">
              <div className="truncate text-base font-semibold">Study Session</div>
              <div className="truncate text-xs text-muted-foreground mt-0.5">
                Pack: <span className="font-medium">{packId}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="hidden sm:inline-flex bg-primary/10 text-primary border-primary/20 font-semibold"
              >
                Card {sessionIndex} of {sessionTotal}
              </Badge>
              <Badge variant="outline" className="sm:hidden font-semibold">
                {sessionIndex}/{sessionTotal}
              </Badge>
            </div>
          </div>

          <div className="mt-3">
            <Progress value={progressPct} className="h-2.5" />
          </div>
        </div>

        {/* Flashcard area */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <Card className="w-full overflow-hidden shadow-lg border-2">
            <CardContent className="p-0">
              <button
                type="button"
                className="group relative w-full text-left"
                onClick={() => setIsFlipped((v) => !v)}
                aria-pressed={isFlipped}
              >
                {/* Front */}
                <div
                  className={
                    "flex min-h-[550px] flex-col items-center justify-center gap-4 p-8 transition-all duration-300 " +
                    (isFlipped
                      ? "absolute inset-0 pointer-events-none opacity-0 scale-[0.98]"
                      : "relative opacity-100")
                  }
                >
                  <div className="text-center space-y-4">
                    <div className="text-4xl font-bold tracking-tight sm:text-5xl text-primary">
                      {card.term}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <span className="text-xs">👆</span>
                      <span>Tap to reveal</span>
                    </div>
                  </div>
                </div>

                {/* Back */}
                <div
                  className={
                    "flex min-h-[550px] flex-col gap-6 p-8 transition-all duration-300 " +
                    (isFlipped
                      ? "relative opacity-100"
                      : "absolute inset-0 pointer-events-none opacity-0")
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b">
                    <div className="min-w-0">
                      <div className="text-2xl font-bold tracking-tight text-primary">
                        {card.term}
                      </div>
                      <div className="mt-1.5 text-base text-muted-foreground font-mono">
                        {card.ipa}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("play audio (mock)", { cardId: card.id });
                      }}
                    >
                      <Volume2 className="h-4 w-4" />
                      Play
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Definition
                    </div>
                    <p className="text-base leading-relaxed text-foreground/90">
                      {card.definition}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {card.examples.length === 1 ? "Example" : "Examples"}
                    </div>
                    <div className="space-y-3">
                      {card.examples.map((example, idx) => (
                        <div key={idx} className="pl-3 border-l-2 border-primary/30">
                          <p className="text-sm leading-relaxed italic text-foreground/80">
                            "{example}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {card.contextImageLabel && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Context image
                        </div>
                      </div>
                      <div className="relative h-56 w-full overflow-hidden rounded-xl border bg-gradient-to-br from-red-200/20 via-white to-indigo-100/60 dark:from-neutral-900 dark:via-neutral-950 dark:to-indigo-950/40">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.14),_transparent_60%)]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-sm font-medium text-muted-foreground">
                              {card.contextImageLabel}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom fixed SRS controls */}
      <div
        className={
          "fixed inset-x-0 bottom-0 z-50 border-t bg-background/75 backdrop-blur supports-[backdrop-filter]:bg-background/60 " +
          (isFlipped ? "opacity-100" : "pointer-events-none opacity-0")
        }
      >
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <Button
              type="button"
              className="h-12 bg-rose-600 text-white hover:bg-rose-600/90"
              onClick={() => goNext("again")}
            >
              <div className="flex w-full flex-col items-center leading-tight">
                <span className="text-[11px] opacity-90">&lt; 1m</span>
                <span className="font-semibold">Again</span>
              </div>
            </Button>
            <Button
              type="button"
              className="h-12 bg-amber-600 text-white hover:bg-amber-600/90"
              onClick={() => goNext("hard")}
            >
              <div className="flex w-full flex-col items-center leading-tight">
                <span className="text-[11px] opacity-90">10m</span>
                <span className="font-semibold">Hard</span>
              </div>
            </Button>
            <Button
              type="button"
              className="h-12 bg-sky-600 text-white hover:bg-sky-600/90"
              onClick={() => goNext("good")}
            >
              <div className="flex w-full flex-col items-center leading-tight">
                <span className="text-[11px] opacity-90">2d</span>
                <span className="font-semibold">Good</span>
              </div>
            </Button>
            <Button
              type="button"
              className="h-12 bg-emerald-600 text-white hover:bg-emerald-600/90"
              onClick={() => goNext("easy")}
            >
              <div className="flex w-full flex-col items-center leading-tight">
                <span className="text-[11px] opacity-90">4d</span>
                <span className="font-semibold">Easy</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </SoftGradientBackground>
  );
}
