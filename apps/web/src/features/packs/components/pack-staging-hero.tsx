import { Film, Play, Tv } from "lucide-react";
import Link from "next/link";

import { MediaPosterBanner } from "@/components/common/media-poster-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { PackStagingView } from "@/features/packs/types";

export type PackStagingHeroProps = {
  pack: PackStagingView;
  stats: { total: number };
  progressPct: number;
};

/**
 * Renders the hero header for the pack staging view, showing media info and study progress.
 */
export function PackStagingHero({ pack, stats, progressPct }: PackStagingHeroProps) {
  const metaLine = [
    pack.media.releaseYear,
    pack.media.subtitle,
    `${stats.total} active cards`,
    `${pack.studyPlan.futureLearningCount} scheduled`,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <MediaPosterBanner
      backdropUrl={pack.media.backdropUrl}
      backdropAlt={`${pack.media.title} backdrop`}
      badges={
        <>
          <Badge
            variant="secondary"
            className="border border-indigo-300/60 bg-white/85 text-indigo-700 shadow-sm backdrop-blur-md dark:border-indigo-400/30 dark:bg-indigo-950/60 dark:text-indigo-200"
          >
            {pack.media.kind === "movie" ? (
              <Film className="mr-1 size-3.5" />
            ) : (
              <Tv className="mr-1 size-3.5" />
            )}
            Study Pack
          </Badge>
          {pack.learnerCefrLevelAtGeneration ? (
            <Badge
              variant="secondary"
              className="border border-foreground/15 bg-white/85 text-foreground shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-background/70"
            >
              {pack.learnerCefrLevelAtGeneration}
            </Badge>
          ) : null}
        </>
      }
      title={pack.media.title}
      meta={metaLine ? <span>{metaLine}</span> : null}
      actions={
        pack.studyPlan.dueCount > 0 ? (
          <Button size="default" className="gap-2 shadow-md" asChild>
            <Link href={`/study/${pack.id}?mode=due`}>
              <Play className="size-4" />
              Review Due
              <Badge variant="secondary" className="ml-1 border-0 bg-white/25 text-white">
                {pack.studyPlan.dueCount}
              </Badge>
            </Link>
          </Button>
        ) : pack.studyPlan.newAvailableToday > 0 ? (
          <Button size="default" className="gap-2 shadow-md" asChild>
            <Link href={`/study/${pack.id}?mode=new`}>
              <Play className="size-4" />
              Learn New
              <Badge variant="secondary" className="ml-1 border-0 bg-white/25 text-white">
                {pack.studyPlan.newAvailableToday}
              </Badge>
            </Link>
          </Button>
        ) : (
          <Button size="default" className="gap-2 shadow-md" disabled>
            <Play className="size-4" />
            Complete For Now
          </Button>
        )
      }
    >
      <div className="max-w-md space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-foreground/75">
          <span>Overall progress</span>
          <span className="font-semibold text-foreground">{progressPct}% mastered</span>
        </div>
        <Progress value={progressPct} className="h-1.5 bg-foreground/15" />
      </div>
    </MediaPosterBanner>
  );
}
