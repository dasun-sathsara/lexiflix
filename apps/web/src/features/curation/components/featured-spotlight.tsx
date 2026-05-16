import { Film, Play, Sparkles, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatYear } from "@/features/curation/lib/format";
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from "@/lib/integrations/tmdb/contracts";

interface FeaturedSpotlightProps {
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  mediaType: "movie" | "tv";
  releaseDate: string | null;
  contentRating: string | null;
  tmdbId: number;
}

export function FeaturedSpotlight({
  title,
  overview,
  posterPath,
  backdropPath,
  mediaType,
  releaseDate,
  contentRating,
  tmdbId,
}: FeaturedSpotlightProps) {
  const posterUrl = buildTmdbImageUrl(posterPath, TMDB_IMAGE_SIZES.poster.md);
  const backdropUrl = buildTmdbImageUrl(backdropPath, TMDB_IMAGE_SIZES.backdrop.lg);
  const year = formatYear(releaseDate);

  return (
    <section className="relative overflow-hidden rounded-[calc(var(--radius)+4px)] border bg-card/50 shadow-sm">
      {backdropUrl && (
        <Image
          src={backdropUrl}
          alt={title}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1280px) 100vw, 1200px"
        />
      )}
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent lg:bg-gradient-to-r lg:from-black/95 lg:via-black/75 lg:to-transparent" />
      <div className="relative grid min-h-[360px] gap-6 p-5 sm:p-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:p-8">
        {/* Poster — desktop only */}
        <div className="relative hidden overflow-hidden rounded-xl shadow-sm ring-1 ring-white/20 lg:block">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={title}
              width={180}
              height={270}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center p-6 text-center text-sm text-white/70">
              {title}
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="flex flex-col justify-end gap-4 text-white">
          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/40 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-white/90 shadow-sm">
              <Sparkles className="size-3" />
              Featured pick
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/40 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-white/90 shadow-sm">
              {mediaType === "movie" ? <Film className="size-3" /> : <Tv className="size-3" />}
              {mediaType === "movie" ? "Movie" : "TV show"}
            </span>
            {year && (
              <span className="inline-flex items-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-white/90 shadow-sm">
                {year}
              </span>
            )}
            {contentRating && (
              <span className="inline-flex items-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-white/90 shadow-sm">
                {contentRating}
              </span>
            )}
          </div>

          {/* Title + overview */}
          <div className="flex flex-col gap-2">
            <h2 className="max-w-3xl text-2xl font-bold tracking-tight sm:text-4xl">{title}</h2>
            <p className="line-clamp-4 max-w-2xl text-xs leading-relaxed text-white/80 sm:text-sm">
              {overview ?? "A curated pick chosen to give learners a strong starting point."}
            </p>
          </div>

          {/* CTA */}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Button asChild size="sm" className="h-8 rounded-full text-xs">
              <Link href={`/media/${tmdbId}?type=${mediaType}`}>
                <Play className="size-3.5 fill-current" />
                Open title
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
