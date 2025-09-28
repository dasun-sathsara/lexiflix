import { GlowingEffect } from "@/components/common/glowing-effect";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    question: "How does LexiFlix personalize my study plan?",
    answer:
      "LexiFlix starts with a CEFR placement check and your stated goals. Every pack is filtered through your level, recent performance, and saved preferences so you always review material that matches your next step forward.",
  },
  {
    question: "How do movies and subtitles get into LexiFlix?",
    answer:
      "Search for a title, confirm the right release, and LexiFlix automatically pulls the matching subtitles before turning them into your study pack.",
  },
  {
    question: "What is included in a study pack?",
    answer:
      "Each pack bundles curated vocabulary with CEFR tags, AI-authored definitions and examples, natural-sounding pronunciation audio, and contextual imagery so you can learn the dialogue in advance.",
  },
  {
    question: "How does LexiFlix protect my progress?",
    answer:
      "Your streaks, packs, and roles stay synced to your LexiFlix account with role-based safeguards. Reviews and reminders follow you across devices so you can pick up right where you left off.",
  },
];

export function FAQSection() {
  return (
    <section
      id="faq"
      className="relative overflow-hidden bg-transparent px-6 py-8 "
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-6xl rounded-[2.25rem] px-8 py-12 sm:px-10 lg:px-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          {/* Header Content */}
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase text-indigo-600 shadow-sm backdrop-blur font-ubuntu-mono dark:border-indigo-900/40 dark:bg-slate-950/50 dark:text-indigo-200">
              FAQ
            </span>
            <h2 id="faq-heading" className="text-balance text-3xl font-semibold sm:text-4xl">
              Everything you're curious about, answered in two taps
            </h2>
            <p className="text-balance text-base text-muted-foreground sm:text-lg">
              Our learners ask smart questions. We built a compact, tappable FAQ so you get to the
              good stuff quickly—no endless scrolling.
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-medium uppercase  text-muted-foreground font-ubuntu-mono">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/50 bg-white/65 px-4 py-1.5 dark:border-indigo-900/50 dark:bg-slate-950/60">
                <span className="size-2 rounded-full bg-indigo-500" aria-hidden="true" />
                Updated weekly
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-purple-200/50 bg-white/65 px-4 py-1.5 dark:border-purple-900/50 dark:bg-slate-950/60">
                <span className="size-2 rounded-full bg-purple-500" aria-hidden="true" />
                Learner feedback
              </span>
            </div>
          </div>

          {/* FAQ Accordion */}
          <Card className="relative overflow-hidden border border-indigo-200/60 bg-white/80 shadow-lg backdrop-blur-sm dark:border-indigo-900/40 dark:bg-slate-950/80 dark:shadow-2xl">
            <GlowingEffect
              blur={6}
              borderWidth={1}
              spread={32}
              proximity={40}
              inactiveZone={0.2}
              className="opacity-15"
              glow
              disabled={false}
            />
            <CardHeader className="relative pb-3 text-center">
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Quick answers whenever you need them
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
                Tap to expand a question—each one keeps your place so you can skim without losing
                focus.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative px-0 pb-1">
              <Accordion
                type="single"
                collapsible
                className="divide-y divide-indigo-100/80 [--radix-accordion-content-text-color:theme(colors.slate.600)] dark:divide-indigo-800/50"
              >
                {faqs.map(({ question, answer }, index) => (
                  <AccordionItem
                    value={`faq-${index}`}
                    key={question}
                    className="group border-none"
                  >
                    <AccordionTrigger className="px-6 py-4 text-left text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors duration-200 hover:no-underline group-hover:bg-indigo-50/50 dark:text-slate-100 dark:hover:text-indigo-300 dark:group-hover:bg-indigo-950/20">
                      <span className="flex items-center gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600 group-hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:group-hover:bg-indigo-800/50">
                          {index + 1}
                        </span>
                        {question}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 pt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      <div className="ml-8 border-l-2 border-indigo-200/60 pl-4 dark:border-indigo-800/60">
                        {answer}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
