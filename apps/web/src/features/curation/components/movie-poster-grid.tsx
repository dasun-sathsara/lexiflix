import { ArrowRight, Film, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AppSectionHeader } from "@/components/common/app-page-header";
import { Badge } from "@/components/ui/badge";
import { formatRating, formatYear } from "@/features/curation/lib/format";
import type { CuratedCatalogEntry } from "@/features/curation/types";
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from "@/lib/integrations/tmdb/contracts";

interface MoviePosterGridProps {
  items: CuratedCatalogEntry[];
}

export function MoviePosterGrid({ items }: MoviePosterGridProps) {
  return (
    <section className="flex flex-col gap-4">
      <AppSectionHeader
        icon={<Film className="size-4 text-muted-foreground" />}
        heading="Movies"
        description="Fast starts for learners who want a single feature-length target."
      />

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const posterUrl = buildTmdbImageUrl(item.posterPath, TMDB_IMAGE_SIZES.poster.md);
          const year = formatYear(item.releaseDate);
          const rating = formatRating(item.voteAverage);

          return (
            <Link
              key={item.id}
              href={`/media/${item.tmdbId}?type=movie`}
              className="group flex h-full flex-col gap-2.5 rounded-[calc(var(--radius)+2px)] border bg-card/40 p-1.5 shadow-sm transition-colors duration-200 ease-out hover:border-primary/25 hover:bg-muted/30"
            >
              {/* Poster */}
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 22vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                    {item.title}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex min-h-[148px] flex-col px-1.5 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight tracking-tight group-hover:text-primary">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {[year, "Movie"].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  {rating && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground">
                      <Star className="size-3" />
                      {rating}
                    </span>
                  )}
                </div>

                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {item.overview ?? "No overview saved for this title yet."}
                </p>

                {item.genres.length > 0 && (
                  <div className="mt-2 flex gap-1.5 overflow-hidden p-0.5 -m-0.5">
                    {item.genres.slice(0, 2).map((genre) => (
                      <Badge
                        key={genre.id}
                        variant="secondary"
                        className="truncate max-w-full shrink min-w-0"
                      >
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between pt-3 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
                  <span>Open title</span>
                  <ArrowRight className="size-3.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
