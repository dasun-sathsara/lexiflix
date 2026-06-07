import {
  ArrowRight,
  Boxes,
  Cpu,
  Film,
  Layers,
  Mail,
  MapPin,
  Repeat,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { ElegantButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COMPANY = {
  product: "LexiFlix",
  website: "https://www.lexiflix.app",
  stage: "Live early-stage product",
  team: "Two-person, self-funded",
  category: "B2C ed-tech / language learning",
  contactEmail: "dasun@lexiflix.app",
  founder: "Dasun Sathsara",
  location: "Sri Lanka",
};

const FLOW_STEPS = [
  {
    step: "01",
    title: "Choose a movie or show",
    description:
      "Pick a title you actually want to watch. LexiFlix works from the subtitles of real films and TV, not from a generic word list.",
    Icon: Film,
  },
  {
    step: "02",
    title: "Analyze the subtitles",
    description:
      "We fetch the subtitles on demand and run them through a language-analysis pipeline that measures word difficulty and parts of speech.",
    Icon: Layers,
  },
  {
    step: "03",
    title: "Extract useful language",
    description:
      "From that analysis we surface the words, phrasal verbs, idioms, slang, and expressions that are genuinely worth learning at your level.",
    Icon: Sparkles,
  },
  {
    step: "04",
    title: "Generate learner-friendly explanations",
    description:
      "Each term becomes a study card with a plain-English definition, fresh example sentences, and natural-sounding pronunciation audio.",
    Icon: Wand2,
  },
  {
    step: "05",
    title: "Review with spaced repetition",
    description:
      "You study the pack before you watch, then reinforce it over time with a spaced-repetition scheduler so the language sticks.",
    Icon: Repeat,
  },
];

const INFRA_ITEMS = [
  {
    title: "Background processing",
    description:
      "Subtitle analysis and study-pack generation are long-running jobs. They run as durable background workflows rather than blocking the app.",
    Icon: Boxes,
  },
  {
    title: "Language analysis & AI",
    description:
      "We pair open-weight NLP models for subtitle analysis with a hosted LLM that writes explanations and adapts content to each learner's level.",
    Icon: Cpu,
  },
  {
    title: "Storage & delivery",
    description:
      "Generated artifacts like audio and images are stored in object storage and served reliably so study packs load quickly when you need them.",
    Icon: Layers,
  },
];

const ROADMAP_ITEMS = [
  "Sharper level adaptation, so packs feel right whether you are closer to A2 or C1.",
  "More control over what counts as worth learning, from everyday speech to specific idioms and slang.",
  "A smoother path from finishing a study pack to actually watching the title with confidence.",
  "Steady improvements to analysis quality and generation cost as we test different models.",
];

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase text-indigo-600 shadow-sm backdrop-blur font-ubuntu-mono dark:border-indigo-900/40 dark:bg-slate-950/50 dark:text-indigo-200">
      {children}
    </span>
  );
}

function SoftCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-indigo-100/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-indigo-900/50 dark:bg-slate-950/40",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function About() {
  return (
    <div className="flex flex-col">
      {/* Intro */}
      <section className="relative overflow-hidden px-6 pt-32 pb-8 sm:pt-36">
        <div className="pointer-events-none absolute inset-x-1/2 top-[-10%] h-[420px] w-[720px] -translate-x-1/2 rounded-[999px] bg-indigo-100/40 blur-3xl dark:bg-indigo-900/30" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <SectionEyebrow>About LexiFlix</SectionEyebrow>
          <h1 className="text-balance text-4xl font-semibold sm:text-5xl">
            A small, self-funded startup helping people learn real English from movies and TV
          </h1>
          <p className="text-balance text-base text-muted-foreground sm:text-lg">
            LexiFlix turns the language inside films and TV shows into structured, level-aware study
            material. We are an early-stage product built by a two-person founding team, and this
            page is the honest version of what we are making and why.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ElegantButton size="elegantLg" className="text-base font-medium" asChild>
              <Link href="/auth">Try LexiFlix</Link>
            </ElegantButton>
            <ElegantButton
              size="elegantLg"
              variant="elegantSecondary"
              className="text-base font-medium"
              asChild
            >
              <a href={`mailto:${COMPANY.contactEmail}`}>Contact the team</a>
            </ElegantButton>
          </div>
        </div>
      </section>

      {/* Why it exists + who it's for */}
      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <SoftCard className="flex flex-col gap-4 p-8">
            <SectionEyebrow>Why it exists</SectionEyebrow>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Subtitles are full of real English. Turning them into lessons is the hard part.
            </h2>
            <p className="text-base text-muted-foreground">
              The language people actually use lives in the shows they already enjoy: natural
              phrasing, phrasal verbs, idioms, and slang you rarely find in a textbook. The problem
              is that watching alone does not turn that exposure into vocabulary you can recall.
            </p>
            <p className="text-base text-muted-foreground">
              Most tools ask learners to pause constantly, look words up, and lose the thread of the
              story. LexiFlix flips that around: it prepares a study pack in advance so you learn
              the useful language first, then watch with more confidence.
            </p>
          </SoftCard>
          <SoftCard className="flex flex-col gap-4 p-8">
            <SectionEyebrow>Who it is for</SectionEyebrow>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              English learners who want to study from the content they already watch
            </h2>
            <p className="text-base text-muted-foreground">
              LexiFlix is built for intermediate and advanced learners who are comfortable enough to
              enjoy movies and series in English but still hit unfamiliar words, expressions, and
              idioms along the way.
            </p>
            <ul className="mt-2 space-y-3 text-sm">
              {[
                "Learners who prefer real, contextual language over isolated word lists.",
                "People studying toward a CEFR level who want material matched to where they are.",
                "Anyone who learns better when the material comes from shows they actually like.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <Users
                    className="mt-[2px] size-4 shrink-0 text-indigo-500 dark:text-indigo-300"
                    aria-hidden="true"
                  />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </SoftCard>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
            <SectionEyebrow>How the product works</SectionEyebrow>
            <h2 className="text-balance text-3xl font-semibold sm:text-4xl">
              From a title you choose to language you remember
            </h2>
            <p className="text-balance text-base text-muted-foreground sm:text-lg">
              The whole flow is designed to happen before you press play, so study time and screen
              time stay separate.
            </p>
          </div>
          <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FLOW_STEPS.map(({ step, title, description, Icon }) => (
              <li key={step}>
                <SoftCard className="flex h-full flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-950/50 dark:text-indigo-300">
                      <Icon className="size-6" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-semibold text-indigo-400 font-ubuntu-mono dark:text-indigo-300">
                      {step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold leading-tight">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </SoftCard>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why AI / cloud matters */}
      <section className="px-6 py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
            <SectionEyebrow>Why AI &amp; cloud matter</SectionEyebrow>
            <h2 className="text-balance text-3xl font-semibold sm:text-4xl">
              AI is part of the product, not decoration
            </h2>
            <p className="text-balance text-base text-muted-foreground sm:text-lg">
              The core of LexiFlix is automated language work: analyzing subtitles, choosing what is
              worth learning, writing clear explanations, and adapting to each learner's level. That
              is only practical with real infrastructure behind it.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {INFRA_ITEMS.map(({ title, description, Icon }) => (
              <SoftCard key={title} className="flex h-full flex-col gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-950/50 dark:text-indigo-300">
                  <Icon className="size-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold leading-tight">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </SoftCard>
            ))}
          </div>
          <p className="mx-auto max-w-3xl text-center text-sm text-muted-foreground">
            We lean on open-weight models where they are cost-effective and keep the system
            deliberately simple, because as a small self-funded team we have to be careful about
            both quality and cost.
          </p>
        </div>
      </section>

      {/* Current stage + roadmap */}
      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <SoftCard className="flex flex-col gap-4 p-8">
            <SectionEyebrow>Where we are today</SectionEyebrow>
            <h2 className="text-2xl font-semibold sm:text-3xl">A live, early-stage product</h2>
            <p className="text-base text-muted-foreground">
              LexiFlix is live and usable today, built and run by a two-person founding team. We are
              self-funded and bootstrapped, which keeps us focused on shipping something genuinely
              useful rather than chasing scale before the product earns it.
            </p>
            <p className="text-base text-muted-foreground">
              Being early-stage means we are honest about scope: the product is real and working,
              and it is also still evolving as we learn from how people use it.
            </p>
          </SoftCard>
          <SoftCard className="flex flex-col gap-4 p-8">
            <SectionEyebrow>What we are building next</SectionEyebrow>
            <h2 className="text-2xl font-semibold sm:text-3xl">The near-term focus</h2>
            <ul className="space-y-3 text-sm">
              {ROADMAP_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <ArrowRight
                    className="mt-[2px] size-4 shrink-0 text-indigo-500 dark:text-indigo-300"
                    aria-hidden="true"
                  />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </SoftCard>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="px-6 pt-16 pb-24">
        <div className="mx-auto max-w-6xl">
          <SoftCard className="flex flex-col items-center gap-6 p-10 text-center">
            <SectionEyebrow>Get in touch</SectionEyebrow>
            <h2 className="text-balance text-3xl font-semibold sm:text-4xl">
              Questions, feedback, or just curious?
            </h2>
            <p className="max-w-2xl text-balance text-base text-muted-foreground">
              We read everything. Whether you are a learner, a potential partner, or evaluating
              LexiFlix, the fastest way to reach the founding team is by email.
            </p>
            <div className="flex flex-col flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground sm:flex-row">
              <a
                href={`mailto:${COMPANY.contactEmail}`}
                className="inline-flex items-center gap-2 font-medium text-foreground hover:text-indigo-600 dark:hover:text-indigo-300"
              >
                <Mail className="size-4" aria-hidden="true" />
                {COMPANY.contactEmail}
              </a>
              <a
                href={COMPANY.website}
                className="inline-flex items-center gap-2 hover:text-foreground"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                {COMPANY.website.replace("https://", "")}
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4" aria-hidden="true" />
                {COMPANY.location}
              </span>
            </div>
            <ElegantButton size="elegantLg" className="group text-base font-medium" asChild>
              <a href={`mailto:${COMPANY.contactEmail}`}>
                <span>Email {COMPANY.founder.split(" ")[0]}</span>
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>
            </ElegantButton>
          </SoftCard>
        </div>
      </section>
    </div>
  );
}
