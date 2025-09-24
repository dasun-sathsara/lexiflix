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
            className="relative overflow-hidden bg-transparent px-6 pb-20 pt-16 sm:pb-24 sm:pt-20"
            aria-labelledby="faq-heading"
        >
            <div className="mx-auto max-w-6xl rounded-[2.25rem] px-8 py-12 sm:px-10 lg:px-14">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
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
                    <Card className="relative overflow-hidden border border-indigo-200/60 bg-transparent shadow-none dark:border-indigo-900/40">
                        <GlowingEffect
                            blur={8}
                            borderWidth={1}
                            spread={42}
                            proximity={48}
                            inactiveZone={0.15}
                            className="opacity-20"
                            glow
                            disabled={false}
                        />
                        <CardHeader className="relative pb-3">
                            <CardTitle className="text-lg font-semibold">
                                Quick answers whenever you need them
                            </CardTitle>
                            <CardDescription>
                                Tap to expand a question—each one keeps your place so you can skim without losing focus.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="relative px-0">
                            <Accordion
                                type="single"
                                collapsible
                                className="divide-y divide-border/60 [--radix-accordion-content-text-color:theme(colors.slate.600)] dark:divide-border"
                            >
                                {faqs.map(({ question, answer }, index) => (
                                    <AccordionItem value={`faq-${index}`} key={question}>
                                        <AccordionTrigger className="px-6 py-4 text-base font-medium text-foreground">
                                            {question}
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-4 text-sm text-muted-foreground">
                                            {answer}
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
