import Link from "next/link";
import ShapeHero from "@/components/common/shape-hero";
import { ElegantButton } from "@/components/ui/button";

export function HomeHero() {
  return (
    <ShapeHero
      title1="Prepare for English Mastery with"
      title2="Movies & TV"
      description="LexiFlix turns subtitles into level-aware vocabulary packs, so you learn the words before you watch."
      cta={
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ElegantButton size="elegantLg" className="text-base font-medium" asChild>
            <Link href="/auth">Get Started Free</Link>
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
