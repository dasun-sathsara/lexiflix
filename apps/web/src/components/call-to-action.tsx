"use client";

/**
 * @author: @dorian_baffier
 * @description: Particle Button
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { ElegantButton } from "@/components/ui/button";
import { LayoutTextFlip } from "@/components/ui/layout-text-flip";

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
              Scan episodes for tricky phrases and cultural references before
              you hit play.
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
        <ElegantButton size="elegantLg" className="text-base font-medium">
          <span>Start Learning Today</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </ElegantButton>
      </div>
    </section>
  );
}
