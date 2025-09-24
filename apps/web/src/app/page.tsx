import { Check, Clapperboard, Headphones, Repeat, Trophy } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/marketing-navbar";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { WobbleCard } from "@/components/ui/wobble-card";
import { CallToActionSection } from "@/components/call-to-action";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Contextual Vocabulary Packs",
    description:
      "Get personalized word lists, idioms, and slang directly from the subtitles of the shows you love—before you hit play.",
    Icon: Clapperboard,
    eyebrow: "Before you watch",
    containerClassName:
      "col-span-1 lg:col-span-2 min-h-[340px] bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600",
    className:
      "flex h-full flex-col justify-between gap-8 px-8 py-14 text-left text-white",
    iconWrapperClass:
      "bg-white/20 text-white shadow-indigo-500/30 dark:bg-white/20",
    bulletTextClass: "text-white/85",
    eyebrowClass: "text-white/80",
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
      "col-span-1 min-h-[320px] bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900",
    className:
      "flex h-full flex-col gap-6 px-8 py-12 text-left text-white",
    iconWrapperClass:
      "bg-white/15 text-white shadow-indigo-400/40",
    bulletTextClass: "text-white/80",
    eyebrowClass: "text-white/80",
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
      "col-span-1 min-h-[320px] bg-gradient-to-br from-white via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900",
    className:
      "flex h-full flex-col gap-6 px-8 py-12 text-left text-slate-900 dark:text-slate-50",
    iconWrapperClass:
      "bg-indigo-500/10 text-indigo-600 shadow-indigo-500/20 dark:bg-indigo-500/20 dark:text-white",
    bulletTextClass: "text-slate-700 dark:text-slate-100",
    eyebrowClass: "text-indigo-600/70 dark:text-white/70",
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
      "col-span-1 md:col-span-1 lg:col-span-2 min-h-[280px] bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500",
    className:
      "flex h-full flex-col justify-between gap-8 px-8 py-12 text-left text-white",
    iconWrapperClass:
      "bg-white/20 text-white shadow-cyan-400/40",
    bulletTextClass: "text-white/85",
    eyebrowClass: "text-white/80",
    bullets: [
      "Personal best trackers keep you energized",
      "Weekly goals adjust to your calendar",
      "Celebrate progress with shareable badges",
    ],
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <MarketingNavbar />
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute inset-0 -z-10 blur-3xl">
          <div className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-300/25 mix-blend-screen dark:bg-indigo-500/25" />
          <div className="absolute right-12 bottom-10 h-56 w-56 rounded-full bg-violet-200/40 mix-blend-screen dark:bg-violet-500/30" />
        </div>
        <HeroHighlight
          containerClassName="!h-auto min-h-[70vh] w-full px-6 pb-24 pt-28 sm:pt-32 lg:pt-36"
          className="mx-auto flex max-w-5xl flex-col items-center gap-8 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-indigo-600 shadow-sm backdrop-blur-sm dark:border-indigo-500/50 dark:bg-indigo-900/40 dark:text-indigo-200">
            Fluent by movie night
          </span>
          <h1 className="text-balance text-[2.75rem] font-bold leading-snug sm:text-[3.25rem] lg:text-[3.75rem]">
            Learn English Naturally from{" "}
            <Highlight className="px-2 py-1 text-indigo-900 dark:text-white">
              Movies &amp; TV
            </Highlight>
          </h1>
          <p className="max-w-3xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
            LexiFlix transforms your favorite shows into powerful language
            lessons with AI-powered vocabulary packs, flashcards, and immersive
            study tools. Prepare in minutes, enjoy every episode, and remember
            more.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="px-8 text-base">
              Get Started Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 text-base"
              asChild
            >
              <Link href="#features">How It Works</Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-indigo-500" />
              AI-personalized lessons in under 3 minutes
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-purple-500" />
              Built for binge-worthy learning sessions
            </span>
          </div>
        </HeroHighlight>
      </section>

      <section id="features" className="relative px-6 py-20 sm:py-24">
        <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-slate-100/70 via-white/0 to-transparent dark:from-slate-800/30" />
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
                bullets,
                iconWrapperClass,
                bulletTextClass,
                eyebrowClass,
              }) => (
                <WobbleCard
                  key={title}
                  containerClassName={containerClassName}
                  className={className}
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

      <CallToActionSection />

      <footer
        id="contact"
        className="border-t border-border/60 bg-white/70 px-6 py-10 text-sm text-muted-foreground backdrop-blur dark:bg-slate-950/60"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium text-foreground">
            LexiFlix © 2025 — An open-source project for global learners.
          </span>
          <div className="flex flex-wrap items-center gap-6">
            <a
              href="mailto:support@lexiflix.app"
              className="hover:text-foreground"
            >
              support@lexiflix.app
            </a>
            <a
              href="https://github.com/lexiflix"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              github.com/lexiflix
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
