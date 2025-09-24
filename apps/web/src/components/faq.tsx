import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlowingEffect } from "@/components/ui/glowing-effect";

const faqs = [
    {
        question: "How does LexiFlix personalize my study plan?",
        answer:
            "Our AI scans the subtitles and metadata of each episode you queue up, then curates vocabulary packs and cultural notes that match your CEFR level and current streak goals.",
    },
    {
        question: "Can I use LexiFlix while I'm watching a show?",
        answer:
            "Yes. Enable Watch Mode to surface inline translations, pronunciations, and quick-save flashcards without pausing the action. Everything syncs in real time across devices.",
    },
    {
        question: "Do you support multiple streaming platforms?",
        answer:
            "LexiFlix works with Netflix, Hulu, Prime Video, Disney+, and local files. We're adding more integrations regularly, and you can request a platform directly inside the app.",
    },
    {
        question: "What happens to the decks I build?",
        answer:
            "Your decks live in the cloud, so you can review on mobile, desktop, or export to Anki. Spaced repetition reminders keep you on track with gentle nudges.",
    },
];

export function FAQSection() {
    return (
        <section
            id="faq"
            className="relative overflow-hidden bg-transparent px-6 py-16 sm:py-20"
            aria-labelledby="faq-heading"
        >
            <div className="mx-auto max-w-6xl rounded-[2.25rem] px-8 py-12 sm:px-10 lg:px-14">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                    {/* Header Content */}
                    <div className="space-y-6">
                        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-600 shadow-sm backdrop-blur dark:border-indigo-900/40 dark:bg-slate-950/50 dark:text-indigo-200">
                            FAQ
                        </span>
                        <h2
                            id="faq-heading"
                            className="text-balance text-3xl font-semibold sm:text-4xl"
                        >
                            Everything you're curious about, answered in two taps
                        </h2>
                        <p className="text-balance text-base text-muted-foreground sm:text-lg">
                            Our learners ask smart questions. We built a compact, tappable FAQ so you get to the good stuff quickly—no endless scrolling.
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
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
                                Tap to expand a question—each one keeps your place so you can skim without losing focus.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="relative px-0 pb-1">
                            <Accordion
                                type="single"
                                collapsible
                                className="divide-y divide-indigo-100/80 dark:divide-indigo-900/50 [--radix-accordion-content-text-color:theme(colors.slate.600)] dark:divide-indigo-800/50"
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
