import { ArrowRight, Star, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AppSectionHeader } from "@/components/common/app-page-header";
import { Badge } from "@/components/ui/badge";
import { buildPosterUrl, formatRating, formatYear } from "@/features/curation/lib/format";
import type { CuratedCatalogEntry } from "@/features/curation/types";

interface TvShowRowsProps {
  items: CuratedCatalogEntry[];
}

export function TvShowRows({ items }: TvShowRowsProps) {
  return (
    <section className="flex flex-col gap-4">
      <AppSectionHeader
        icon={<Tv className="size-4 text-muted-foreground" />}
        heading="TV Shows"
        description="Show-level picks first. Choose a season after you open the title."
      />

      {/* Rows */}
      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const posterUrl = buildPosterUrl(item.posterPath);
          const year = formatYear(item.releaseDate);
          const rating = formatRating(item.voteAverage);

          return (
            <Link
              key={item.id}
              href={`/media/${item.tmdbId}?type=tv`}
              className="group grid gap-3 rounded-[calc(var(--radius)+2px)] border bg-card/40 p-3 shadow-sm transition-colors duration-200 ease-out hover:border-primary/25 hover:bg-muted/30 md:grid-cols-[88px_minmax(0,1fr)_auto] md:gap-4 md:p-4"
            >
              {/* Poster */}
              <div className="relative hidden overflow-hidden rounded-xl border bg-muted md:block">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={item.title}
                    width={88}
                    height={132}
                    className="h-[132px] w-[88px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-[132px] w-[88px] items-center justify-center p-3 text-center text-xs text-muted-foreground">
                    {item.title}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex min-w-0 flex-col gap-2.5">
                {/* Title row */}
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold tracking-tight group-hover:text-primary">
                    {item.title}
                  </p>
                  {item.displaySubtitle && (
                    <span className="rounded-md border bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground">
                      {item.displaySubtitle}
                    </span>
                  )}
                  {year && (
                    <span className="rounded-md border bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground">
                      {year}
                    </span>
                  )}
                  {rating && (
                    <span className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground">
                      <Star className="size-3" />
                      {rating}
                    </span>
                  )}
                </div>

                {/* Overview */}
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {item.overview ?? "No overview saved for this show yet."}
                </p>

                {/* Genres + hint */}
                <div className="flex items-center gap-2 overflow-hidden p-0.5 -m-0.5">
                  {item.genres.slice(0, 3).map((genre) => (
                    <Badge
                      key={genre.id}
                      variant="secondary"
                      className="truncate max-w-full shrink min-w-0"
                    >
                      {genre.name}
                    </Badge>
                  ))}
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    Season-level analysis
                  </span>
                </div>
              </div>

              {/* CTA */}
              <div className="flex items-center md:justify-end">
                <span className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border bg-card px-3 text-sm font-medium tracking-tight shadow-xs transition-colors group-hover:text-primary">
                  Open show
                  <ArrowRight className="size-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
