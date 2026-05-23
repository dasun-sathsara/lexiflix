import {
  ArrowRight,
  ChevronRight,
  Film,
  GraduationCap,
  Play,
  Sparkles,
  Star,
  Tv,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AppPageHeader, AppSectionHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { AppEmptyState, AppStat } from "@/components/common/app-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCefrProfile } from "@/features/assessment/server/profile";
import { listPublishedCuratedEntries } from "@/features/curation/server/catalog";
import { getEffectiveCefrLevel } from "@/features/settings/components/_utils";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { getSessionOrNull } from "@/lib/auth-guards";
import type { StoredCefrLevel } from "@/lib/server/db/json-contracts";
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const CEFR_LEVELS: StoredCefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default async function CuratedPage() {
  const session = await getSessionOrNull();
  const profile = session ? await getCefrProfile(session.user.id) : null;
  const userLevel = profile
    ? getEffectiveCefrLevel(profile.manualOverrideLevel, profile.assessedLevel)
    : null;

  // Default to user level if available, otherwise A1
  const activeLevel: StoredCefrLevel =
    userLevel && CEFR_LEVELS.includes(userLevel) ? userLevel : "A1";

  // Fetch all published curated entries
  const allPublishedEntries = await listPublishedCuratedEntries({ limit: 500 });

  // Filter entries to match the active level
  const publishedEntries = allPublishedEntries.filter((e) => e.level === activeLevel);
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
            description={`Hand-picked recommendations suited for level ${activeLevel}`}
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

        {/* Assessment / Level Tuning Banner (shown if user hasn't assessed their level yet) */}
        {!userLevel && (
          <Card className="border-amber-200/70 bg-amber-500/5 py-0 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-200/70 bg-amber-500/10 text-amber-600 dark:border-amber-500/30 dark:text-amber-300">
                  <GraduationCap className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold tracking-tight">Personalize Your Feed</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                    We're currently showing basic{" "}
                    <span className="font-semibold text-foreground">A1</span> recommendations. Take
                    our language assessment or select your level manually in settings to personalize
                    your curated feed!
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button asChild size="sm" variant="outline" className="h-8 rounded-full text-xs">
                  <Link href="/settings?tab=account">Configure Level</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="h-8 rounded-full text-xs bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600"
                >
                  <Link href="/onboarding/assessment">
                    Take Assessment
                    <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
            title={`No titles in ${activeLevel} yet`}
            description={`We haven't added any curated recommendations for the ${activeLevel} level yet. Check back soon!`}
          />
        )}

        {movieEntries.length > 0 && <MoviePosterGrid items={movieEntries} />}
        {tvEntries.length > 0 && <TvShowRows items={tvEntries} />}
      </AppPageShell>
    </>
  );
}
