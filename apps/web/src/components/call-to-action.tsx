"use client";

import { LayoutTextFlip } from "@/components/ui/layout-text-flip";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

export function CallToActionSection() {
  return (
    <section id="cta" className="relative bg-transparent px-6 pb-24 pt-4">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          <LayoutTextFlip
            text="Turn Every Episode Into"
            words={[
              "a Guided Lesson",
              "Pronunciation Practice",
              "Confidence on Camera",
              "Real Conversations",
            ]}
            duration={2000}
          />
          <p className="max-w-3xl text-balance text-base text-muted-foreground sm:text-lg">
            Prep with laser-focused vocabulary, let LexiFlix surface the moments
            that matter, and switch seamlessly between learning and bingeing
            without losing the plot—or the context.
          </p>
        </motion.div>
        <div className="grid w-full gap-4 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-indigo-100/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-indigo-900/50 dark:bg-slate-950/40">
            <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">
              Prep Mode
            </h4>
            <p className="mt-3 text-sm text-muted-foreground">
              Scan episodes for tricky phrases and cultural references before you
              hit play.
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-100/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-indigo-900/50 dark:bg-slate-950/40">
            <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">
              Watch &amp; Learn
            </h4>
            <p className="mt-3 text-sm text-muted-foreground">
              Tap into synchronized subtitles, pronunciation cues, and inline
              definitions while you watch.
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-100/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-indigo-900/50 dark:bg-slate-950/40">
            <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">
              Lock It In
            </h4>
            <p className="mt-3 text-sm text-muted-foreground">
              Turn favorite scenes into spaced reviews that keep phrases fresh
              long after the credits roll.
            </p>
          </div>
        </div>
        <Button
          size="lg"
          className="group relative isolate inline-flex h-auto items-center gap-3 overflow-hidden rounded-full border border-slate-800/70 bg-black px-12 py-3.5 text-base font-semibold text-white shadow-[0_18px_36px_-20px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-20px_rgba(0,0,0,0.75)] focus-visible:ring-offset-2"
        >
          <span
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.18),transparent_55%)] opacity-60 transition-opacity duration-500 group-hover:opacity-85"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute inset-[-120%] -z-20 bg-[radial-gradient(circle_at_50%_100%,rgba(58,175,169,0.6)_0%,transparent_60%),radial-gradient(circle_at_50%_100%,rgba(255,140,0,0.4)_0%,transparent_70%),radial-gradient(circle_at_50%_100%,rgba(238,130,238,0.3)_0%,transparent_80%)] opacity-70 blur-2xl transition-opacity duration-500 group-hover:opacity-90"
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute inset-0 -z-10 translate-x-[-120%] bg-white/15 transition-transform duration-500 ease-out group-hover:translate-x-0"
            aria-hidden="true"
          />
          <Sparkles
            aria-hidden="true"
            className="relative size-5 shrink-0 text-cyan-200 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-2"
          />
          <span className="relative">Start Learning Today</span>
        </Button>
      </div>
    </section>
  );
}
