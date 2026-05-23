"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { LayoutTextFlip } from "@/components/common/layout-text-flip";
import { ElegantButton } from "@/components/ui/button";

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
          <p className="max-w-3xl text-balance font-medium text-base text-muted-foreground sm:text-lg">
            LexiFlix walks you from level check to active recall: choose a title, let our subtitle
            analysis surface the vocabulary you'll encounter, and master it before the opening
            credits roll.
          </p>
        </motion.div>
        <div className="grid w-full gap-4 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-indigo-100/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-indigo-900/50 dark:bg-slate-950/40">
            <h4 className="text-sm font-semibold uppercase  text-indigo-500 font-ubuntu-mono dark:text-indigo-300">
              Profile &amp; Align
            </h4>
            <p className="mt-3 text-sm text-muted-foreground font-normal">
              Take our adaptive CEFR placement check to establish your baseline profile, then
              configure custom study preferences (like vocabulary kinds and daily card pacing).
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-100/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-indigo-900/50 dark:bg-slate-950/40">
            <h4 className="text-sm font-semibold uppercase  text-indigo-500 font-ubuntu-mono dark:text-indigo-300">
              Analyze &amp; Customize
            </h4>
            <p className="mt-3 text-sm text-muted-foreground font-normal">
              Browse curated movies and TV seasons. LexiFlix fetches subtitles on-demand and runs a
              dual NLP/LLM pipeline to isolate vocabulary, phrasal verbs, idioms, and slang.
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-100/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-indigo-900/50 dark:bg-slate-950/40">
            <h4 className="text-sm font-semibold uppercase  text-indigo-500 font-ubuntu-mono dark:text-indigo-300">
              Generate &amp; Study
            </h4>
            <p className="mt-3 text-sm text-muted-foreground font-normal">
              Generate up to 100 personalized study cards with Gemini definitions, example
              sentences, Polly audio, and SM-2 scheduled spaced repetition reviews.
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
