import { ChevronRight, Clapperboard, Film, Play, Sparkles, Star, Tv } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listPublishedCuratedEntries } from "@/features/curation/server/catalog";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { IMAGE_BASE_URL, TMDB_IMAGE_SIZES } from "@/lib/tmdb";

export const metadata: Metadata = {
  title: "Curated - LexiFlix",
  description: "Published curated movie and TV picks for signed-in learners",
};

function buildPosterUrl(path: string | null) {
  if (!path) {
    return null;
  }

  return `${IMAGE_BASE_URL}${TMDB_IMAGE_SIZES.poster.md}${path}`;
}

function buildBackdropUrl(path: string | null) {
  if (!path) {
    return null;
  }

  return `${IMAGE_BASE_URL}${TMDB_IMAGE_SIZES.backdrop.lg}${path}`;
}

function formatYear(date: string | null) {
  if (!date) {
    return "Date unknown";
  }

  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(year) ? String(year) : "Date unknown";
}

function formatVoteAverage(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1) : "N/A";
}

function FeaturedSpotlight({
  title,
  overview,
  posterPath,
  backdropPath,
  mediaType,
  releaseDate,
  contentRating,
  tmdbId,
}: {
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  mediaType: "movie" | "tv";
  releaseDate: string | null;
  contentRating: string | null;
  tmdbId: number;
}) {
  const posterUrl = buildPosterUrl(posterPath);
  const backdropUrl = buildBackdropUrl(backdropPath);

  return (
    <section className="relative overflow-hidden rounded-[32px] border bg-card/50 shadow-xl shadow-black/5">
      {backdropUrl ? (
        <Image
          src={backdropUrl}
          alt={title}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1280px) 100vw, 1200px"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_38%)]" />

      <div className="relative grid gap-6 p-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:p-8">
        <div className="relative hidden overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl lg:block">
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

        <div className="flex flex-col justify-end gap-4 text-white">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border border-white/15 bg-white/10 text-white">
              <Sparkles data-icon="inline-start" />
              Featured pick
            </Badge>
            <Badge className="border border-white/15 bg-white/10 text-white">
              {mediaType === "movie" ? (
                <Film data-icon="inline-start" />
              ) : (
                <Tv data-icon="inline-start" />
              )}
              {mediaType === "movie" ? "Movie" : "TV show"}
            </Badge>
            <Badge className="border border-white/15 bg-white/10 text-white">
              {formatYear(releaseDate)}
            </Badge>
            {contentRating ? (
              <Badge className="border border-white/15 bg-white/10 text-white">
                {contentRating}
              </Badge>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
              {overview || "A curated pick chosen to give learners a strong starting point."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href={`/media/${tmdbId}`}>
                <Play data-icon="inline-start" />
                Open title
              </Link>
            </Button>
            {mediaType === "tv" ? (
              <p className="text-sm text-white/70">
                Season choice happens after you open the show.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function MoviePosterGrid({
  items,
}: {
  items: Awaited<ReturnType<typeof listPublishedCuratedEntries>>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <Film data-icon="inline-start" />
              Movies
            </Badge>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Curated movie picks</h2>
          <p className="text-sm text-muted-foreground">
            Fast starts for learners who want a single feature-length target.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const posterUrl = buildPosterUrl(item.posterPath);

          return (
            <Link
              key={item.id}
              href={`/media/${item.tmdbId}`}
              className="group flex flex-col gap-3 rounded-[24px] border bg-card/40 p-3 shadow-sm transition-all hover:-translate-y-1 hover:border-amber-300/50 hover:bg-card/70 hover:shadow-lg hover:shadow-amber-500/10"
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-[18px] bg-muted">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 22vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                    {item.title}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium group-hover:text-amber-700 dark:group-hover:text-amber-200">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatYear(item.releaseDate)}</p>
                  </div>
                  <Badge variant="outline">
                    <Star data-icon="inline-start" />
                    {formatVoteAverage(item.voteAverage)}
                  </Badge>
                </div>

                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {item.overview || "No overview saved for this title yet."}
                </p>

                <div className="flex flex-wrap gap-2">
                  {item.genres.slice(0, 2).map((genre) => (
                    <Badge key={genre.id} variant="secondary">
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function TvShowRows({ items }: { items: Awaited<ReturnType<typeof listPublishedCuratedEntries>> }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            <Tv data-icon="inline-start" />
            TV shows
          </Badge>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Curated show picks</h2>
        <p className="text-sm text-muted-foreground">
          Show-level picks first. Choose a season after you open the title.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const posterUrl = buildPosterUrl(item.posterPath);

          return (
            <Link
              key={item.id}
              href={`/media/${item.tmdbId}`}
              className="group grid gap-4 rounded-[26px] border bg-card/40 p-4 shadow-sm transition-all hover:border-indigo-300/50 hover:bg-card/70 hover:shadow-lg hover:shadow-indigo-500/10 md:grid-cols-[96px_minmax(0,1fr)_auto]"
            >
              <div className="relative overflow-hidden rounded-[18px] border bg-muted">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={item.title}
                    width={96}
                    height={144}
                    className="h-[144px] w-[96px] object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="flex h-[144px] w-[96px] items-center justify-center p-3 text-center text-xs text-muted-foreground">
                    {item.title}
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-medium group-hover:text-indigo-700 dark:group-hover:text-indigo-200">
                    {item.title}
                  </p>
                  {item.displaySubtitle ? (
                    <Badge variant="secondary">{item.displaySubtitle}</Badge>
                  ) : null}
                  <Badge variant="outline">{formatYear(item.releaseDate)}</Badge>
                  <Badge variant="outline">
                    <Star data-icon="inline-start" />
                    {formatVoteAverage(item.voteAverage)}
                  </Badge>
                </div>

                <p className="line-clamp-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {item.overview || "No overview saved for this show yet."}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {item.genres.slice(0, 3).map((genre) => (
                    <Badge key={genre.id} variant="secondary">
                      {genre.name}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    Open the show to choose a season later.
                  </span>
                </div>
              </div>

              <div className="flex items-center md:justify-end">
                <Button variant="outline" className="group-hover:border-indigo-300/60">
                  Open show
                  <ChevronRight data-icon="inline-end" />
                </Button>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default async function CuratedPage() {
  const publishedEntries = await listPublishedCuratedEntries({ limit: 100 });
  const [featuredEntry, ...restEntries] = publishedEntries;
  const movieEntries = restEntries.filter((entry) => entry.mediaType === "movie");
  const tvEntries = restEntries.filter((entry) => entry.mediaType === "tv");

  return (
    <>
      <AppTopbar title="Curated" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 p-6">
        <div className="pointer-events-none absolute -left-16 top-24 size-80 rounded-full bg-amber-500/8 blur-[110px]" />
        <div className="pointer-events-none absolute right-0 top-1/3 size-72 rounded-full bg-indigo-500/7 blur-[120px]" />

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              <Clapperboard data-icon="inline-start" />
              Signed-in catalog
            </Badge>
            <Badge variant="outline">
              <Sparkles data-icon="inline-start" />
              Published picks only
            </Badge>
          </div>
          <div className="flex max-w-3xl flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Curated titles worth learning from
            </h1>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              This shelf is stable because it reads from the LexiFlix catalog, not live TMDB
              summaries. Movies and TV shows are intentionally presented differently because the
              learner journey is different once you open them.
            </p>
          </div>
        </section>

        {featuredEntry ? (
          <FeaturedSpotlight
            title={featuredEntry.title}
            overview={featuredEntry.overview}
            posterPath={featuredEntry.posterPath}
            backdropPath={featuredEntry.backdropPath}
            mediaType={featuredEntry.mediaType}
            releaseDate={featuredEntry.releaseDate}
            contentRating={featuredEntry.contentRating}
            tmdbId={featuredEntry.tmdbId}
          />
        ) : (
          <section className="rounded-[30px] border border-dashed bg-card/30 p-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Nothing is published yet</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              The curated page is live, but the catalog is empty until an admin publishes entries
              from the curation workspace.
            </p>
          </section>
        )}

        {movieEntries.length > 0 ? <MoviePosterGrid items={movieEntries} /> : null}
        {tvEntries.length > 0 ? <TvShowRows items={tvEntries} /> : null}
      </div>
    </>
  );
}
