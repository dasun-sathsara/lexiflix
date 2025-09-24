import { Check, Clapperboard, Headphones, Repeat, Trophy } from "lucide-react";

import { WobbleCard } from "@/components/ui/wobble-card";
import { cn } from "@/lib/utils";

const features = [
    {
        title: "Contextual Vocabulary Packs",
        description:
            "Get personalized word lists, idioms, and slang directly from the subtitles of the shows you love—before you hit play.",
        Icon: Clapperboard,
        eyebrow: "Before you watch",
        containerClassName:
            "col-span-1 lg:col-span-2 min-h-[340px]",
        className:
            "flex h-full flex-col justify-between gap-8 px-8 py-14 text-left text-slate-900",
        iconWrapperClass:
            "bg-white/80 text-slate-900 shadow-indigo-500/30",
        bulletTextClass: "text-slate-700",
        eyebrowClass: "text-slate-600",
        cardStyle: {
            backgroundColor: "#fefcff",
            backgroundImage:
                "radial-gradient(circle at 30% 70%, rgba(173, 216, 230, 0.35), transparent 60%), radial-gradient(circle at 70% 30%, rgba(255, 182, 193, 0.4), transparent 60%)",
        },
        overlayClassName: "bg-transparent backdrop-blur-[2px]",
        bullets: [
            "Preview dialogue with AI-translated context cues",
            "Export ready-to-study decks in one click",
            "Supports Netflix, Hulu, Prime Video, and more",
        ],
    },
    {
        title: "Multi-Modal Learning",
        description:
            "Study words with AI-generated definitions, natural pronunciations, and contextual images for deeper understanding.",
        Icon: Headphones,
        eyebrow: "Make it memorable",
        containerClassName:
            "col-span-1 min-h-[320px]",
        className:
            "flex h-full flex-col gap-6 px-8 py-12 text-left text-slate-900",
        iconWrapperClass:
            "bg-white/80 text-slate-900 shadow-indigo-400/40",
        bulletTextClass: "text-slate-700",
        eyebrowClass: "text-slate-600",
        cardStyle: {
            background:
                "linear-gradient(45deg, #FFB3D9 0%, #FFD1DC 20%, #FFF0F5 40%, #E6F3FF 60%, #D1E7FF 80%, #C7E9F1 100%)",
        },
        overlayClassName: "bg-transparent backdrop-blur-[2px]",
        bullets: [
            "Hear accents the way natives speak",
            "See scenes reimagined as vivid visuals",
        ],
    },
    {
        title: "Smart Flashcards (SRS)",
        description:
            "Retain what you learn with active recall and a spaced repetition system designed to fit your memory curve.",
        Icon: Repeat,
        eyebrow: "Remember more",
        containerClassName:
            "col-span-1 min-h-[320px]",
        className:
            "flex h-full flex-col gap-6 px-8 py-12 text-left text-slate-900",
        iconWrapperClass:
            "bg-white/80 text-slate-900 shadow-teal-400/40",
        bulletTextClass: "text-slate-700",
        eyebrowClass: "text-slate-600",
        cardStyle: {
            background:
                "linear-gradient(225deg, #FFB3D9 0%, #FFD1DC 20%, #FFF0F5 40%, #E6F3FF 60%, #D1E7FF 80%, #C7E9F1 100%)",
        },
        overlayClassName: "bg-transparent backdrop-blur-[2px]",
        bullets: [
            "Adaptive reviews based on your streak",
            "Example sentences stay tied to the scene",
        ],
    },
    {
        title: "Stay Motivated",
        description:
            "Track streaks, unlock badges, and receive friendly reminders to keep your learning on track.",
        Icon: Trophy,
        eyebrow: "Momentum matters",
        containerClassName:
            "col-span-1 md:col-span-1 lg:col-span-2 min-h-[280px]",
        className:
            "flex h-full flex-col justify-between gap-8 px-8 py-12 text-left text-slate-900",
        iconWrapperClass:
            "bg-white/80 text-slate-900 shadow-cyan-400/40",
        bulletTextClass: "text-slate-700",
        eyebrowClass: "text-slate-600",
        cardStyle: {
            backgroundColor: "#f0fdfa",
            backgroundImage:
                "linear-gradient(45deg, rgba(240,253,250,1) 0%, rgba(204,251,241,0.7) 30%, rgba(153,246,228,0.5) 60%, rgba(94,234,212,0.4) 100%), radial-gradient(circle at 40% 30%, rgba(255,255,255,0.8) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(167,243,208,0.5) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(209,250,229,0.6) 0%, transparent 45%)",
        },
        overlayClassName: "bg-transparent backdrop-blur-[2px]",
        bullets: [
            "Personal best trackers keep you energized",
            "Weekly goals adjust to your calendar",
            "Celebrate progress with shareable badges",
        ],
    },
];

export function FeaturesSection() {
    return (
        <section
            id="features"
            className="relative bg-white px-6 py-20 sm:py-24 dark:bg-slate-950"
        >
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-transparent [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
            <div className="mx-auto flex max-w-6xl flex-col gap-12">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-balance text-3xl font-semibold sm:text-4xl">
                        Everything you need to turn screen time into study time
                    </h2>
                    <p className="mt-4 text-balance text-base text-muted-foreground sm:text-lg">
                        Learn faster with rich context, beautiful visuals, and smart
                        repetition that reinforces what you love to watch.
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {features.map(
                        ({
                            title,
                            description,
                            Icon,
                            eyebrow,
                            containerClassName,
                            className,
                            cardStyle,
                            bullets,
                            iconWrapperClass,
                            bulletTextClass,
                            eyebrowClass,
                            overlayClassName,
                        }) => (
                            <WobbleCard
                                key={title}
                                containerClassName={containerClassName}
                                className={className}
                                style={cardStyle}
                                overlayClassName={overlayClassName}
                            >
                                <div className="flex flex-wrap items-start gap-4">
                                    <div
                                        className={cn(
                                            "flex size-12 items-center justify-center rounded-full shadow-md",
                                            iconWrapperClass
                                        )}
                                    >
                                        <Icon className="size-6" aria-hidden="true" />
                                    </div>
                                    <div className="space-y-3">
                                        {eyebrow ? (
                                            <p
                                                className={cn(
                                                    "text-xs font-semibold uppercase tracking-[0.4em]",
                                                    eyebrowClass
                                                )}
                                            >
                                                {eyebrow}
                                            </p>
                                        ) : null}
                                        <h3 className="text-2xl font-semibold leading-tight">
                                            {title}
                                        </h3>
                                        <p className="text-base/relaxed opacity-90">
                                            {description}
                                        </p>
                                    </div>
                                </div>
                                {bullets?.length ? (
                                    <ul className="mt-6 space-y-2 text-sm">
                                        {bullets.map((item) => (
                                            <li
                                                key={item}
                                                className={cn(
                                                    "flex items-start gap-2",
                                                    bulletTextClass
                                                )}
                                            >
                                                <Check className="mt-[2px] size-4 shrink-0" aria-hidden="true" />
                                                <span className="leading-relaxed">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </WobbleCard>
                        )
                    )}
                </div>
            </div>
        </section>
    );
}
