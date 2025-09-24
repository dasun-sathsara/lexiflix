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
    <section id="cta" className="relative bg-transparent px-6 py-8">
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
              "a Personalized Pack",
              "Confident Comprehension",
              "Vocabulary Gains",
              "Reliable Reviews",
            ]}
            duration={2000}
          />
          <p className="max-w-3xl text-balance text-base text-muted-foreground sm:text-lg">
            LexiFlix walks you from level check to active recall: choose a title, let our subtitle
            analysis surface the vocabulary you'll encounter, and master it before the opening
            credits roll.
          </p>
        </motion.div>
        <div className="grid w-full gap-4 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-indigo-100/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-indigo-900/50 dark:bg-slate-950/40">
            <h4 className="text-sm font-semibold uppercase  text-indigo-500 font-ubuntu-mono dark:text-indigo-300">
              Assess &amp; Align
            </h4>
            <p className="mt-3 text-sm text-muted-foreground">
              Complete a CEFR-aware placement check and set preferences so every pack targets the
              skills you want to strengthen.
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-100/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-indigo-900/50 dark:bg-slate-950/40">
            <h4 className="text-sm font-semibold uppercase  text-indigo-500 font-ubuntu-mono dark:text-indigo-300">
              Select &amp; Curate
            </h4>
            <p className="mt-3 text-sm text-muted-foreground">
              Browse a rich catalog of movies and shows, pull in matching subtitles automatically,
              and let LexiFlix spotlight the vocabulary that matters most.
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-100/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-indigo-900/50 dark:bg-slate-950/40">
            <h4 className="text-sm font-semibold uppercase  text-indigo-500 font-ubuntu-mono dark:text-indigo-300">
              Study &amp; Review
            </h4>
            <p className="mt-3 text-sm text-muted-foreground">
              Dive into AI-crafted definitions, audio, and images, then reinforce every term with
              spaced repetition reminders that fit your pace.
            </p>
          </div>
        </div>
        <ElegantButton size="elegantLg" className="text-base font-medium cursor-pointer">
          <span>See LexiFlix in Action</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </ElegantButton>
      </div>
    </section>
  );
}
