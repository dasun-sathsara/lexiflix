import { ArrowLeft, Film, Play, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { PackStagingView } from "@/features/packs/types";

import { cefrBadgeClass } from "./_utils";

export type PackStagingHeroProps = {
  pack: PackStagingView;
  stats: { total: number };
  progressPct: number;
};

/**
 * Renders the hero header for the pack staging view, showing media info and study progress.
 */
export function PackStagingHero({ pack, stats, progressPct }: PackStagingHeroProps) {
  return (
    <Card className="relative overflow-hidden border-indigo-200/60 dark:border-indigo-500/20">
      {pack.media.backdropUrl ? (
        <div className="absolute inset-0">
          <Image
            src={pack.media.backdropUrl}
            alt={`${pack.media.title} backdrop`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
        </div>
      ) : null}
      <CardContent className="relative p-6 sm:p-8">
        <div className="mb-5 -mt-1">
          <Button variant="ghost" size="sm" asChild className="gap-2 hover:bg-background/60">
            <Link href="/decks">
              <ArrowLeft className="size-4" />
              Back to Decks
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="border border-indigo-200/60 bg-white/60 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-950/30 dark:text-indigo-200"
              >
                {pack.media.kind === "movie" ? (
                  <Film className="mr-1 size-3.5" />
                ) : (
                  <Tv className="mr-1 size-3.5" />
                )}
                Study Pack
              </Badge>
              {pack.learnerCefrLevelAtGeneration ? (
                <Badge className={`border ${cefrBadgeClass(pack.learnerCefrLevelAtGeneration)}`}>
                  {pack.learnerCefrLevelAtGeneration}
                </Badge>
              ) : null}
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {pack.media.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {[
                  pack.media.releaseYear,
                  pack.media.subtitle,
                  `${stats.total} active cards`,
                  `${pack.studyPlan.futureLearningCount} scheduled`,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>

            <div className="max-w-md space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Overall progress</span>
                <span className="font-normal text-foreground">{progressPct}% mastered</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {pack.studyPlan.dueCount > 0 ? (
              <Button size="default" className="gap-2 shadow-sm" asChild>
                <Link href={`/study/${pack.id}?mode=due`}>
                  <Play className="size-4" />
                  Review Due
                  <Badge variant="secondary" className="ml-1 bg-white/20 text-white">
                    {pack.studyPlan.dueCount}
                  </Badge>
                </Link>
              </Button>
            ) : pack.studyPlan.newAvailableToday > 0 ? (
              <Button size="default" className="gap-2 shadow-sm" asChild>
                <Link href={`/study/${pack.id}?mode=new`}>
                  <Play className="size-4" />
                  Learn New
                  <Badge variant="secondary" className="ml-1 bg-white/20 text-white">
                    {pack.studyPlan.newAvailableToday}
                  </Badge>
                </Link>
              </Button>
            ) : (
              <Button size="default" className="gap-2 shadow-sm" disabled>
                <Play className="size-4" />
                Complete For Now
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
