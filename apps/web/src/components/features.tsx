import { Check, Clapperboard, Headphones, Repeat, Trophy } from "lucide-react";

import { WobbleCard } from "@/components/ui/wobble-card";
import { DotBackground } from "@/components/ui/dot-background";
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
            "flex h-full flex-col justify-between gap-8 px-8 py-14 text-left text-white",
        iconWrapperClass:
            "bg-white/20 text-white shadow-indigo-500/30 dark:bg-white/20",
        bulletTextClass: "text-white/85",
        eyebrowClass: "text-white/80",
        cardStyle: {
            backgroundColor: "#000000",
            backgroundImage:
                "radial-gradient(circle at 50% 100%, rgba(70, 85, 110, 0.5) 0%, transparent 60%), radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.4) 0%, transparent 70%), radial-gradient(circle at 50% 100%, rgba(181, 184, 208, 0.3) 0%, transparent 80%)",
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
            "flex h-full flex-col gap-6 px-8 py-12 text-left text-white",
        iconWrapperClass:
            "bg-white/15 text-white shadow-indigo-400/40",
        bulletTextClass: "text-white/80",
        eyebrowClass: "text-white/80",
        cardStyle: {
            backgroundColor: "#000000",
            backgroundImage:
                "radial-gradient(circle at 50% 100%, rgba(58, 175, 169, 0.6) 0%, transparent 60%), radial-gradient(circle at 50% 100%, rgba(255, 140, 0, 0.4) 0%, transparent 70%), radial-gradient(circle at 50% 100%, rgba(238, 130, 238, 0.3) 0%, transparent 80%)",
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
            "flex h-full flex-col gap-6 px-8 py-12 text-left text-white",
        iconWrapperClass:
            "bg-white/15 text-white shadow-teal-400/40",
        bulletTextClass: "text-white/85",
        eyebrowClass: "text-white/80",
        cardStyle: {
            backgroundColor: "#000000",
            background:
                "radial-gradient(70% 55% at 50% 50%, #2a5d77 0%, #184058 18%, #0f2a43 34%, #0a1b30 50%, #071226 66%, #040d1c 80%, #020814 92%, #01040d 97%, #000309 100%), radial-gradient(160% 130% at 10% 10%, rgba(0,0,0,0) 38%, #000309 76%, #000208 100%), radial-gradient(160% 130% at 90% 90%, rgba(0,0,0,0) 38%, #000309 76%, #000208 100%)",
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
            "flex h-full flex-col justify-between gap-8 px-8 py-12 text-left text-white",
        iconWrapperClass:
            "bg-white/20 text-white shadow-cyan-400/40",
        bulletTextClass: "text-white/85",
        eyebrowClass: "text-white/80",
        cardStyle: {
            backgroundColor: "#0a0a0a",
            backgroundImage:
                "radial-gradient(ellipse at 20% 30%, rgba(56, 189, 248, 0.4) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 70%), radial-gradient(ellipse at 60% 20%, rgba(236, 72, 153, 0.25) 0%, transparent 50%), radial-gradient(ellipse at 40% 80%, rgba(34, 197, 94, 0.2) 0%, transparent 65%)",
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
