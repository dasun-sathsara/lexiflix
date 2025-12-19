"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import {
    Bookmark,
    BookmarkCheck,
    EyeOff,
    Film,
    Filter,
    Hash,
    Layers,
    Play,
    Sparkles,
    Tags,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";

const MOVIE_DATA = {
    title: "Interstellar",
    year: 2014,
    genres: ["Sci-Fi", "Drama"],
    difficulty: {
        level: "C1",
        label: "Advanced",
    },
    stats: {
        wordsExtracted: 42,
        idioms: 15,
    },
    backdropUrl: "https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg",
} as const;

type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

type PartOfSpeech = "Noun" | "Verb" | "Idiom";

type VocabItem = {
    id: string;
    term: string;
    partOfSpeech: PartOfSpeech;
    cefr: CefrLevel;
    definition: string;
    context: string;
    known?: boolean;
};

const VOCAB_LIST: VocabItem[] = [
    {
        id: "relativity",
        term: "Relativity",
        partOfSpeech: "Noun",
        cefr: "C1",
        definition:
            "A scientific principle describing how measurements of time and space depend on the observer’s motion and gravitational field.",
        context: "Relativity dictates that time moves slower here than it does on Earth.",
        known: false,
    },
    {
        id: "tether",
        term: "Tether",
        partOfSpeech: "Verb",
        cefr: "B2",
        definition:
            "To tie or fasten something so it stays connected and cannot move freely; to restrict movement by attaching a line.",
        context: "Tether the lander—if the wind picks up, we can’t afford to drift.",
        known: true,
    },
    {
        id: "magnitude",
        term: "Magnitude",
        partOfSpeech: "Noun",
        cefr: "B2",
        definition:
            "The size, extent, or importance of something—often used for forces, effects, or measurements.",
        context: "The magnitude of the wave is enough to crush the engines.",
        known: false,
    },
    {
        id: "make-do",
        term: "Make do",
        partOfSpeech: "Idiom",
        cefr: "B1",
        definition:
            "To manage with limited resources; to accept what is available and continue anyway.",
        context: "We’ll have to make do with what we have—there’s no resupply out here.",
        known: true,
    },
    {
        id: "salvage",
        term: "Salvage",
        partOfSpeech: "Verb",
        cefr: "B2",
        definition:
            "To rescue or recover something valuable from loss, damage, or destruction; to save what remains.",
        context: "If we can salvage the comms array, we might still call them.",
        known: false,
    },
    {
        id: "rendezvous",
        term: "Rendezvous",
        partOfSpeech: "Noun",
        cefr: "C1",
        definition:
            "A planned meeting at a specific time and place; in spaceflight, the act of docking or meeting in orbit.",
        context: "We’ll rendezvous with the station at the edge of the gravity well.",
        known: false,
    },
    {
        id: "in-the-long-run",
        term: "In the long run",
        partOfSpeech: "Idiom",
        cefr: "B1",
        definition:
            "Over a long period of time; eventually, when considering the future consequences.",
        context: "In the long run, the risk is worth it if we can secure a new home.",
        known: false,
    },
    {
        id: "calibrate",
        term: "Calibrate",
        partOfSpeech: "Verb",
        cefr: "C1",
        definition:
            "To adjust an instrument or process carefully so it produces accurate results; to fine-tune.",
        context: "Calibrate the sensors again—something’s off with the readings.",
        known: false,
    },
];

function cefrBadgeClass(level: CefrLevel) {
    const letter = level[0];
    if (letter === "A") return "bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:text-emerald-200 dark:border-emerald-500/20";
    if (letter === "B") return "bg-amber-500/10 text-amber-800 border-amber-200/60 dark:text-amber-200 dark:border-amber-500/20";
    return "bg-rose-500/10 text-rose-700 border-rose-200/60 dark:text-rose-200 dark:border-rose-500/20";
}

function truncate(text: string, max = 120) {
    if (text.length <= max) return text;
    return text.slice(0, max - 1).trimEnd() + "…";
}

function toTabValue(tab: string): "all" | "nouns" | "verbs" | "idioms" {
    if (tab === "nouns" || tab === "verbs" || tab === "idioms") return tab;
    return "all";
}

export default function PackDetailPage({ params }: { params: { id: string } }) {
    // Per spec we ignore params.id for data, but we still use it for navigation.
    const packId = params.id;

    const [activeTab, setActiveTab] = React.useState<"all" | "nouns" | "verbs" | "idioms">("all");
    const [hideKnown, setHideKnown] = React.useState(true);

    const [bookmarkedIds, setBookmarkedIds] = React.useState<Set<string>>(() => new Set(["relativity"]));
    const [ignoredIds, setIgnoredIds] = React.useState<Set<string>>(() => new Set());

    const filtered = React.useMemo(() => {
        return VOCAB_LIST.filter((item) => {
            if (ignoredIds.has(item.id)) return false;
            if (hideKnown && item.known) return false;

            if (activeTab === "nouns") return item.partOfSpeech === "Noun";
            if (activeTab === "verbs") return item.partOfSpeech === "Verb";
            if (activeTab === "idioms") return item.partOfSpeech === "Idiom";
            return true;
        });
    }, [activeTab, hideKnown, ignoredIds]);

    const cefrProfile = React.useMemo(() => {
        // Simple distribution based on the mock list (keeps UI honest).
        const total = VOCAB_LIST.length;
        const counts = new Map<string, number>();
        for (const item of VOCAB_LIST) {
            counts.set(item.cefr, (counts.get(item.cefr) ?? 0) + 1);
        }

        const groups: { label: string; pct: number; color: "A" | "B" | "C" }[] = [
            {
                label: "A-level",
                pct: Math.round((((counts.get("A1") ?? 0) + (counts.get("A2") ?? 0)) / total) * 100),
                color: "A",
            },
            {
                label: "B-level",
                pct: Math.round((((counts.get("B1") ?? 0) + (counts.get("B2") ?? 0)) / total) * 100),
                color: "B",
            },
            {
                label: "C-level",
                pct: Math.round((((counts.get("C1") ?? 0) + (counts.get("C2") ?? 0)) / total) * 100),
                color: "C",
            },
        ];

        // Ensure it sums to 100 for a tidy UI.
        const sum = groups.reduce((acc, g) => acc + g.pct, 0);
        if (sum !== 100) {
            groups[1].pct = Math.max(0, Math.min(100, groups[1].pct + (100 - sum)));
        }

        return groups;
    }, []);

    return (
        <>
            <AppTopbar title="Pack" />

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6">
                <Card className="relative overflow-hidden border-indigo-200/60 dark:border-indigo-500/20">
                    <div className="absolute inset-0">
                        <Image
                            src={MOVIE_DATA.backdropUrl}
                            alt={`${MOVIE_DATA.title} backdrop`}
                            fill
                            priority
                            sizes="(max-width: 1024px) 100vw, 1024px"
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-500/15 via-transparent to-purple-500/15" />
                    </div>

                    <CardContent className="relative p-6 sm:p-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary" className="border border-indigo-200/60 bg-white/60 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-950/30 dark:text-indigo-200">
                                        <Film className="mr-1 h-3.5 w-3.5" />
                                        Study Pack
                                    </Badge>
                                    <Badge className={"border " + cefrBadgeClass(MOVIE_DATA.difficulty.level)}>
                                        {MOVIE_DATA.difficulty.level} — {MOVIE_DATA.difficulty.label}
                                    </Badge>
                                </div>

                                <div className="space-y-1">
                                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                                        {MOVIE_DATA.title}
                                    </h1>
                                    <p className="text-sm text-muted-foreground">
                                        {MOVIE_DATA.year} • {MOVIE_DATA.genres.join(" • ")}
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                                        <Hash className="h-3.5 w-3.5" />
                                        {MOVIE_DATA.stats.wordsExtracted} words extracted
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                                        <Tags className="h-3.5 w-3.5" />
                                        {MOVIE_DATA.stats.idioms} idioms
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Button size="lg" className="shadow-sm" asChild>
                                    <Link href={`/study/${packId}`}>
                                        <Play className="mr-2 h-4 w-4" />
                                        Start Learning
                                    </Link>
                                </Button>
                                <Button size="lg" variant="secondary" asChild>
                                    <Link href="/browse">
                                        <Layers className="mr-2 h-4 w-4" />
                                        Back to Browse
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="pb-4">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-muted-foreground" />
                                            Filters
                                        </CardTitle>
                                        <CardDescription>Refine the list without losing context.</CardDescription>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2 sm:justify-end">
                                        <div className="space-y-0.5">
                                            <div className="text-sm font-medium">Hide known words</div>
                                            <div className="text-xs text-muted-foreground">Focus on what’s new.</div>
                                        </div>
                                        <Switch checked={hideKnown} onCheckedChange={setHideKnown} />
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <Tabs
                                    value={activeTab}
                                    onValueChange={(v) => setActiveTab(toTabValue(v))}
                                    className="gap-4"
                                >
                                    <TabsList className="w-full justify-start">
                                        <TabsTrigger value="all">All</TabsTrigger>
                                        <TabsTrigger value="nouns">Nouns</TabsTrigger>
                                        <TabsTrigger value="verbs">Verbs</TabsTrigger>
                                        <TabsTrigger value="idioms">Idioms</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value={activeTab}>
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <p className="text-sm text-muted-foreground">
                                                Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
                                                <span className="font-medium text-foreground">{VOCAB_LIST.length}</span> items
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="gap-2">
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    Mock pack (no backend)
                                                </Badge>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <div className="flex items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold tracking-tight">Vocabulary List</h2>
                                    <p className="text-sm text-muted-foreground">Tap bookmark/ignore to curate your session.</p>
                                </div>
                            </div>

                            {filtered.length === 0 ? (
                                <Card>
                                    <CardContent className="p-6">
                                        <p className="text-sm text-muted-foreground">No items match these filters. Try showing known words.</p>
                                    </CardContent>
                                </Card>
                            ) : null}

                            {filtered.map((item) => {
                                const isBookmarked = bookmarkedIds.has(item.id);
                                const isIgnored = ignoredIds.has(item.id);

                                return (
                                    <Card key={item.id} className="overflow-hidden">
                                        <CardContent className="p-5">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0 space-y-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="text-lg font-semibold tracking-tight">{item.term}</div>
                                                        <Badge variant="secondary">{item.partOfSpeech}</Badge>
                                                        <Badge className={"border " + cefrBadgeClass(item.cefr)}>{item.cefr}</Badge>
                                                        {item.known ? <Badge variant="outline">Known</Badge> : null}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <p className="text-sm text-muted-foreground">{truncate(item.definition, 160)}</p>
                                                        <p className="text-sm italic text-foreground/90">“{item.context}”</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 sm:justify-end">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="shrink-0"
                                                        onClick={() => {
                                                            setBookmarkedIds((prev) => {
                                                                const next = new Set(prev);
                                                                if (next.has(item.id)) next.delete(item.id);
                                                                else next.add(item.id);
                                                                return next;
                                                            });
                                                        }}
                                                        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
                                                    >
                                                        {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant={isIgnored ? "secondary" : "ghost"}
                                                        size="icon"
                                                        className="shrink-0"
                                                        onClick={() => {
                                                            setIgnoredIds((prev) => {
                                                                const next = new Set(prev);
                                                                if (next.has(item.id)) next.delete(item.id);
                                                                else next.add(item.id);
                                                                return next;
                                                            });
                                                        }}
                                                        aria-label={isIgnored ? "Undo ignore" : "Ignore"}
                                                    >
                                                        <EyeOff className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    <aside className="space-y-6">
                        <Card className="sticky top-6">
                            <CardHeader>
                                <CardTitle>Linguistic Profile</CardTitle>
                                <CardDescription>CEFR distribution for this pack.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {cefrProfile.map((g) => {
                                    const badgeClass =
                                        g.color === "A"
                                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:text-emerald-200 dark:border-emerald-500/20"
                                            : g.color === "B"
                                                ? "bg-amber-500/10 text-amber-800 border-amber-200/60 dark:text-amber-200 dark:border-amber-500/20"
                                                : "bg-rose-500/10 text-rose-700 border-rose-200/60 dark:text-rose-200 dark:border-rose-500/20";

                                    return (
                                        <div key={g.label} className="space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <Badge className={"border " + badgeClass}>{g.label}</Badge>
                                                    <span className="text-sm text-muted-foreground">coverage</span>
                                                </div>
                                                <span className="text-sm font-medium">{g.pct}%</span>
                                            </div>
                                            <Progress value={g.pct} className="h-2" />
                                        </div>
                                    );
                                })}

                                <div className="rounded-2xl border bg-muted/20 p-4">
                                    <p className="text-sm font-medium">Suggested approach</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Start with C-level terms first, then reinforce B-level idioms for fluency.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </>
    );
}
