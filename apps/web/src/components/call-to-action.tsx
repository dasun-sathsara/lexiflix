"use client";

import { LayoutTextFlip } from "@/components/ui/layout-text-flip";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

export function CallToActionSection() {
  return (
    <section id="cta" className="relative px-6 pb-24 pt-4">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950" />
        <div className="absolute -top-24 left-[5%] h-72 w-72 rounded-full bg-indigo-300/40 blur-3xl dark:bg-indigo-500/20" />
        <div className="absolute bottom-0 right-[12%] h-80 w-80 rounded-full bg-pink-200/40 blur-3xl dark:bg-pink-500/20" />
        <div className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-200/30 opacity-30" />
      </div>
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
            duration={3200}
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
        <Button size="lg" className="px-8 text-base">
          Start Learning Today
        </Button>
      </div>
    </section>
  );
}
