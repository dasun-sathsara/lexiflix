"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowLeft, BookOpen, ChevronRight, Headphones, Volume2 } from "lucide-react";

import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Flashcard = {
    id: string;
    term: string;
    ipa: string;
    definition: string;
    context: string;
    contextImageLabel: string;
};

const FLASHCARDS: Flashcard[] = [
    {
        id: "relativity",
        term: "Relativity",
        ipa: "/ˌrɛləˈtɪvɪti/",
        definition:
            "A principle in physics describing how measurements of time and space depend on the observer’s motion and the gravitational field.",
        context: "Relativity dictates that time moves slower here than it does on Earth.",
        contextImageLabel: "A warped clock face near a planet.",
    },
    {
        id: "rendezvous",
        term: "Rendezvous",
        ipa: "/ˈrɒndɪvuː/",
        definition:
            "A planned meeting at a specific time and place; in spaceflight, the act of two spacecraft meeting and potentially docking.",
        context: "We’ll rendezvous with the station at the edge of the gravity well.",
        contextImageLabel: "Two spacecraft aligning in orbit.",
    },
    {
        id: "calibrate",
        term: "Calibrate",
        ipa: "/ˈkælɪbreɪt/",
        definition:
            "To adjust an instrument or system carefully so it produces accurate results; to fine-tune settings.",
        context: "Calibrate the sensors again—something’s off with the readings.",
        contextImageLabel: "A control panel with precision dials.",
    },
];

function clampToInt(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function maskTermInSentence(sentence: string, term: string) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    const masked = sentence.replace(regex, "____");
    return masked;
}

export default function StudyPage({ params }: { params: { id: string } }) {
    const packId = params.id;

    const sessionTotal = 20;
    const [sessionIndex, setSessionIndex] = React.useState(1);
    const [cardIndex, setCardIndex] = React.useState(0);
    const [isFlipped, setIsFlipped] = React.useState(false);

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
        <SoftGradientBackground className="min-h-[calc(100vh-1px)]">
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-28 pt-5 sm:px-6">
                {/* Focus mode header */}
                <div className="flex items-center justify-between gap-4">
                    <Button variant="ghost" size="sm" asChild className="-ml-2">
                        <Link href={`/pack/${packId}`}>
                            <ArrowLeft className="h-4 w-4" />
                            Exit
                        </Link>
                    </Button>

                    <div className="min-w-0 text-center">
                        <div className="truncate text-sm font-medium">Study Session</div>
                        <div className="truncate text-xs text-muted-foreground">Pack: {packId}</div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="hidden sm:inline-flex">
                            Card {sessionIndex} of {sessionTotal}
                        </Badge>
                        <Badge variant="outline" className="sm:hidden">
                            {sessionIndex}/{sessionTotal}
                        </Badge>
                    </div>
                </div>

                <div className="mt-3">
                    <Progress value={progressPct} className="h-2" />
                </div>

                {/* Flashcard area */}
                <div className="mt-8 flex flex-1 flex-col items-center justify-center">
                    <Card className="w-full overflow-hidden shadow-sm">
                        <CardContent className="p-0">
                            <button
                                type="button"
                                className="group relative w-full text-left"
                                onClick={() => setIsFlipped((v) => !v)}
                                aria-pressed={isFlipped}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5" />

                                {/* Front */}
                                <div
                                    className={
                                        "relative flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 transition-all duration-300 " +
                                        (isFlipped ? "pointer-events-none opacity-0 scale-[0.99]" : "opacity-100")
                                    }
                                >
                                    <div className="text-center">
                                        <div className="text-3xl font-semibold tracking-tight sm:text-4xl">{card.term}</div>
                                        <div className="mt-2 text-sm text-muted-foreground">Tap to reveal</div>
                                    </div>
                                    <Button
                                        type="button"
                                        size="lg"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsFlipped(true);
                                        }}
                                        className="shadow-sm"
                                    >
                                        Reveal
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Back */}
                                <div
                                    className={
                                        "relative flex min-h-[320px] flex-col gap-6 p-7 transition-all duration-300 " +
                                        (isFlipped ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0")
                                    }
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-2xl font-semibold tracking-tight">{card.term}</div>
                                            <div className="mt-1 text-sm text-muted-foreground">{card.ipa}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    console.log("play audio (mock)", { cardId: card.id });
                                                }}
                                            >
                                                <Volume2 className="h-4 w-4" />
                                                Play
                                            </Button>
                                            <Button type="button" variant="secondary" size="sm" onClick={(e) => e.stopPropagation()}>
                                                <Headphones className="h-4 w-4" />
                                                Focus
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-sm font-medium text-muted-foreground">Definition</div>
                                        <p className="text-sm leading-relaxed">{card.definition}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-medium text-muted-foreground">Context image</div>
                                            <Badge variant="secondary" className="gap-2">
                                                <BookOpen className="h-3.5 w-3.5" />
                                                Mock
                                            </Badge>
                                        </div>
                                        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-200/70 via-white to-indigo-100/60 p-6 dark:from-neutral-900 dark:via-neutral-950 dark:to-indigo-950/40">
                                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.14),_transparent_60%)]" />
                                            <div className="relative">
                                                <div className="text-sm font-medium">{card.contextImageLabel}</div>
                                                <div className="mt-1 text-xs text-muted-foreground">(Placeholder image panel)</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </CardContent>
                    </Card>

                    {/* Context sentence */}
                    <div className="mt-6 w-full rounded-2xl border bg-background/60 p-4 text-sm shadow-sm backdrop-blur-sm">
                        <div className="text-xs font-medium text-muted-foreground">Subtitle context</div>
                        <p className="mt-2 leading-relaxed">
                            {isFlipped ? (
                                <span>{card.context}</span>
                            ) : (
                                <span>
                                    {maskTermInSentence(card.context, card.term)}
                                    <span className="sr-only"> (word hidden until revealed)</span>
                                </span>
                            )}
                        </p>
                    </div>
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
                    <div className="hidden text-sm text-muted-foreground sm:block">
                        Rate your recall
                        <div className="text-xs">Pick instinctively. Keep moving.</div>
                    </div>

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
