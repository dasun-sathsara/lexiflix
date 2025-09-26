import Link from "next/link";

import { CallToActionSection } from "@/components/call-to-action";
import { FAQSection } from "@/components/faq";
import { FeaturesSection } from "@/components/features";
import { MarketingNavbar } from "@/components/marketing-navbar";
import { ElegantButton } from "@/components/ui/button";
import { ShapeHero } from "@/components/ui/shape-hero";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <MarketingNavbar />
      <ShapeHero
        title1="Prepare for English Mastery with"
        title2="Movies & TV"
        description="LexiFlix builds level-aware vocabulary packs from the subtitles of the stories you plan to watch, so you walk into every episode confident, prepared, and ready to retain more."
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-white/70 px-4 py-1 text-xs font-semibold uppercase  text-indigo-600 shadow-sm backdrop-blur-sm font-ubuntu-mono dark:border-indigo-500/50 dark:bg-indigo-900/40 dark:text-indigo-200">
            Pre-learn before you press play
          </span>
        }
        cta={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <ElegantButton size="elegantLg" className="text-base font-medium">
              Get Started Free
            </ElegantButton>
            <ElegantButton
              size="elegantLg"
              variant="elegantSecondary"
              className="text-base font-medium"
              asChild
            >
              <Link href="#features">How It Works</Link>
            </ElegantButton>
          </div>
        }
        footer={
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-indigo-500" />
              Vocabulary packs sourced directly from subtitles
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-purple-500" />
              Designed for focused pre-watch study sessions
            </span>
          </div>
        }
      />

      <FeaturesSection />

      <div className="relative flex h-[50rem] w-full items-center justify-center bg-white dark:bg-black">
        <div
          className={cn(
            "absolute inset-0",
            "[background-size:18px_18px]",
            "[background-image:linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)]",
          )}
        />
        {/* Radial gradient for the container to give a faded look */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-black"></div>
        <p className="relative z-20 bg-gradient-to-b from-neutral-200 to-neutral-500 bg-clip-text py-8 text-4xl font-bold text-transparent sm:text-7xl">
          <CallToActionSection />
        </p>
      </div>

      <FAQSection />

      <footer className="px-6 pb-12 pt-10 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-3xl border border-border/60 bg-white/70 px-6 py-6 backdrop-blur-sm dark:border-border/40 dark:bg-slate-950/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="font-medium text-foreground">
              LexiFlix © 2025 — An open-source project for global learners.
            </span>
            <p className="text-xs sm:text-sm">
              Built to turn every episode into an immersive English lesson.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#contact" className="hover:text-foreground">
              Contact
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
            <a href="mailto:support@lexiflix.app" className="hover:text-foreground">
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
