import { Film, Play, Sparkles, Star, Tv } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AppPageHeader, AppSectionHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { AppEmptyState, AppStat } from "@/components/common/app-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listPublishedCuratedEntries } from "@/features/curation/server/catalog";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { IMAGE_BASE_URL, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";

export const metadata: Metadata = {
  title: "Curated — LexiFlix",
  description: "Published curated movie and TV picks for signed-in learners",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPosterUrl(path: string | null) {
  if (!path) return null;
  return `${IMAGE_BASE_URL}${TMDB_IMAGE_SIZES.poster.md}${path}`;
}

function buildBackdropUrl(path: string | null) {
  if (!path) return null;
  return `${IMAGE_BASE_URL}${TMDB_IMAGE_SIZES.backdrop.lg}${path}`;
}

function formatYear(date: string | null) {
  if (!date) return null;
  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(year) ? String(year) : null;
}

function formatRating(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1) : null;
}

// ---------------------------------------------------------------------------
// FeaturedSpotlight
// ---------------------------------------------------------------------------

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
  const year = formatYear(releaseDate);

  return (
    <section className="relative overflow-hidden rounded-[calc(var(--radius)+4px)] border bg-card/50 shadow-lg">
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
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_38%)]" />

      <div className="relative grid gap-6 p-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:p-8">
        {/* Poster — desktop only */}
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

        {/* Text content */}
        <div className="flex flex-col justify-end gap-4 text-white">
          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs">
              <Sparkles className="size-3.5" />
              Featured pick
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs">
              {mediaType === "movie" ? <Film className="size-3.5" /> : <Tv className="size-3.5" />}
              {mediaType === "movie" ? "Movie" : "TV show"}
            </span>
            {year && (
              <span className="inline-flex items-center rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs">
                {year}
              </span>
            )}
            {contentRating && (
              <span className="inline-flex items-center rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs">
                {contentRating}
              </span>
            )}
          </div>

          {/* Title + overview */}
          <div className="flex flex-col gap-3">
            <h2 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
              {overview ?? "A curated pick chosen to give learners a strong starting point."}
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href={`/media/${tmdbId}`}>
                <Play className="size-4 fill-current" />
                Open title
              </Link>
            </Button>
            {mediaType === "tv" && (
              <p className="text-sm text-white/70">
                Season choice happens after you open the show.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// MoviePosterGrid
// ---------------------------------------------------------------------------

function MoviePosterGrid({
  items,
}: {
  items: Awaited<ReturnType<typeof listPublishedCuratedEntries>>;
}) {
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
          const posterUrl = buildPosterUrl(item.posterPath);
          const year = formatYear(item.releaseDate);
          const rating = formatRating(item.voteAverage);

          return (
            <Link
              key={item.id}
              href={`/media/${item.tmdbId}`}
              className="group flex flex-col gap-3 rounded-[calc(var(--radius)+2px)] border bg-card/40 p-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-amber-300/50 hover:bg-card/60 hover:shadow-md hover:shadow-amber-500/10"
            >
              {/* Poster */}
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 22vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                    {item.title}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-tight group-hover:text-amber-700 dark:group-hover:text-amber-200">
                      {item.title}
                    </p>
                    {year && <p className="text-xs text-muted-foreground">{year}</p>}
                  </div>
                  {rating && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 text-xs text-muted-foreground">
                      <Star className="size-3" />
                      {rating}
                    </span>
                  )}
                </div>

                <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">
                  {item.overview ?? "No overview saved for this title yet."}
                </p>

                {item.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.genres.slice(0, 2).map((genre) => (
                      <Badge key={genre.id} variant="secondary">
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// TvShowRows
// ---------------------------------------------------------------------------

function TvShowRows({ items }: { items: Awaited<ReturnType<typeof listPublishedCuratedEntries>> }) {
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
              href={`/media/${item.tmdbId}`}
              className="group grid gap-4 rounded-[calc(var(--radius)+2px)] border bg-card/40 p-4 shadow-sm transition-all duration-200 ease-out hover:border-indigo-300/50 hover:bg-card/60 hover:shadow-md hover:shadow-indigo-500/10 dark:hover:border-indigo-500/30 md:grid-cols-[88px_minmax(0,1fr)_auto]"
            >
              {/* Poster */}
              <div className="relative hidden overflow-hidden rounded-xl border bg-muted transition-shadow group-hover:shadow-md md:block">
                {posterUrl ? (
                  <Image
                    src={posterUrl}
                    alt={item.title}
                    width={88}
                    height={132}
                    className="h-[132px] w-[88px] object-cover transition-transform duration-500 group-hover:scale-105"
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
                  <p className="text-base font-semibold tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
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
                <div className="flex flex-wrap items-center gap-2">
                  {item.genres.slice(0, 3).map((genre) => (
                    <Badge key={genre.id} variant="secondary">
                      {genre.name}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    Choose a season after opening.
                  </span>
                </div>
              </div>

              {/* CTA */}
              <div className="flex items-center md:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 group-hover:border-indigo-300/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-300"
                >
                  Open show
                </Button>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CuratedPage() {
  const publishedEntries = await listPublishedCuratedEntries({ limit: 100 });
  const [featuredEntry, ...restEntries] = publishedEntries;

  const movieEntries = restEntries.filter((e) => e.mediaType === "movie");
  const tvEntries = restEntries.filter((e) => e.mediaType === "tv");

  const stats = {
    total: publishedEntries.length,
    movies: publishedEntries.filter((e) => e.mediaType === "movie").length,
    tv: publishedEntries.filter((e) => e.mediaType === "tv").length,
  };

  return (
    <>
      <AppTopbar title="Curated" />

      <AppPageShell>
        <section>
          <AppPageHeader
            heading="Curated Picks"
            stats={
              stats.total > 0 ? (
                <>
                  <AppStat icon={Sparkles} label="Titles" value={stats.total} tone="accent" />
                  <AppStat icon={Film} label="Movies" value={stats.movies} />
                  <AppStat icon={Tv} label="TV Shows" value={stats.tv} />
                </>
              ) : null
            }
          />
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
          <AppEmptyState
            icon={Sparkles}
            title="Nothing published yet"
            description="The catalog is live but empty. An admin needs to publish entries from the curation workspace first."
          />
        )}

        {movieEntries.length > 0 && <MoviePosterGrid items={movieEntries} />}
        {tvEntries.length > 0 && <TvShowRows items={tvEntries} />}
      </AppPageShell>
    </>
  );
}
