import Link from "next/link";
import ShapeHero from "@/components/common/shape-hero";
import { ElegantButton } from "@/components/ui/button";

export function HomeHero() {
  return (
    <ShapeHero
      title1="Prepare for English Mastery with"
      title2="Movies & TV"
      description="LexiFlix builds level-aware vocabulary packs from the subtitles of the stories you plan to watch, so you walk into every episode confident, prepared, and ready to retain more."
      badge={
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200/70 bg-white/70 px-4 py-0 text-xs font-semibold uppercase  text-indigo-600 shadow-sm backdrop-blur-sm font-ubuntu-mono dark:border-indigo-500/50 dark:bg-indigo-900/40 dark:text-indigo-200">
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
  );
}
