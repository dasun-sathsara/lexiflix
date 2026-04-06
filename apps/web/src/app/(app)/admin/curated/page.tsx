import {
  EyeIcon,
  EyeOffIcon,
  FilmIcon,
  RefreshCcwIcon,
  SearchIcon,
  ShieldIcon,
  SparklesIcon,
  StarIcon,
  Trash2Icon,
  TvMinimalIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/features/browse/components/pagination-controls";
import { AdminCuratedControls } from "@/features/curation/components/admin-curated-controls";
import {
  buildCuratedAdminDiscoverParams,
  parseCuratedAdminSearchParams,
} from "@/features/curation/lib/admin-query";
import {
  curateTmdbItemAction,
  deleteCuratedEntryAction,
  refreshCuratedEntryAction,
  saveCuratedEntryFeaturedRankAction,
  setCuratedEntryPublishedAction,
} from "@/features/curation/server/actions";
import { listCuratedEntriesForAdmin } from "@/features/curation/server/catalog";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireAdmin } from "@/lib/auth-guards";
import {
  discoverMedia,
  type Genre,
  getGenres,
  IMAGE_BASE_URL,
  searchMedia,
  TMDB_IMAGE_SIZES,
  type TMDBResult,
} from "@/lib/tmdb";

export const metadata: Metadata = {
  title: "Curated Admin - LexiFlix",
  description: "Admin workspace for curated movies and TV shows",
};

type AdminCuratedPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function createGenreMap(genres: Genre[]) {
  return Object.fromEntries(genres.map((genre) => [genre.id, genre.name]));
}

function buildPosterUrl(path: string | null) {
  if (!path) {
    return null;
  }

  return `${IMAGE_BASE_URL}${TMDB_IMAGE_SIZES.poster.sm}${path}`;
}

function formatReleaseLabel(date: string | null | undefined) {
  if (!date) {
    return "Date unknown";
  }

  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(year) ? String(year) : "Date unknown";
}

function formatVoteAverage(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const numericValue = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(1) : "N/A";
}

function formatPopularity(value: string | null) {
  if (!value) {
    return "No popularity signal";
  }

  const numericValue = Number.parseFloat(value);
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(0)} popularity` : value;
}

function getResultTitle(result: TMDBResult) {
  return result.title || result.name || "Untitled";
}

function getResultDate(result: TMDBResult) {
  return result.release_date || result.first_air_date || null;
}

function getResultGenres(result: TMDBResult, genreMap: Record<number, string>) {
  return result.genre_ids
    .map((genreId) => genreMap[genreId])
    .filter(Boolean)
    .slice(0, 3);
}

function StatStrip({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex min-w-[132px] flex-col gap-1 rounded-2xl border bg-muted/30 p-3">
      <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </div>
  );
}

function PosterThumb({ title, posterPath }: { title: string; posterPath: string | null }) {
  const posterUrl = buildPosterUrl(posterPath);

  return (
    <div className="relative size-14 overflow-hidden rounded-xl border bg-muted/40">
      {posterUrl ? (
        <Image src={posterUrl} alt={title} fill sizes="56px" className="object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center p-2 text-center text-[10px] text-muted-foreground">
          {title}
        </div>
      )}
    </div>
  );
}

export default async function AdminCuratedPage({ searchParams }: AdminCuratedPageProps) {
  const session = await requireAdmin();
  const params = await searchParams;
  const queryState = parseCuratedAdminSearchParams(params);

  const remoteResultsPromise =
    queryState.mode === "search"
      ? queryState.query
        ? searchMedia(queryState.query, queryState.mediaType, queryState.page)
        : Promise.resolve(null)
      : discoverMedia(queryState.mediaType, buildCuratedAdminDiscoverParams(queryState));

  const [movieGenres, tvGenres, curatedEntries, remoteResults] = await Promise.all([
    getGenres("movie"),
    getGenres("tv"),
    listCuratedEntriesForAdmin({ limit: 500 }),
    remoteResultsPromise,
  ]);

  const activeGenres = queryState.mediaType === "movie" ? movieGenres.genres : tvGenres.genres;
  const genreMap = createGenreMap(activeGenres);
  const curatedLookup = new Map(
    curatedEntries.map((entry) => [`${entry.mediaType}:${entry.tmdbId}`, entry]),
  );
  const visibleCuratedEntries = curatedEntries.filter(
    (entry) => entry.mediaType === queryState.mediaType,
  );
  const publishedCount = curatedEntries.filter((entry) => entry.isPublished).length;
  const movieCount = curatedEntries.filter((entry) => entry.mediaType === "movie").length;
  const tvCount = curatedEntries.filter((entry) => entry.mediaType === "tv").length;

  return (
    <>
      <AppTopbar title="Curated Admin" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
        <section className="flex flex-col gap-5 rounded-[28px] border bg-background/95 p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="border border-amber-300/70 bg-amber-500/15 text-amber-950 dark:border-amber-500/30 dark:text-amber-100">
                  <ShieldIcon data-icon="inline-start" />
                  Admin workspace
                </Badge>
                <Badge variant="outline">{session.user.email}</Badge>
              </div>

              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  Curated catalog control room
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Search titles when you already know what you want. Switch to browse mode when you
                  need TMDB discover filters, sorting, and decade ranges. Every curated row is
                  persisted from a detail fetch, not from summary cards.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatStrip
                label="Catalog"
                value={String(curatedEntries.length)}
                detail="Total curated rows"
              />
              <StatStrip
                label="Published"
                value={String(publishedCount)}
                detail="Visible to signed-in users"
              />
              <StatStrip label="Movies" value={String(movieCount)} detail="Movie shelves" />
              <StatStrip label="TV" value={String(tvCount)} detail="Show-level shelves" />
            </div>
          </div>

          <Separator />

          <AdminCuratedControls
            movieGenres={movieGenres.genres}
            tvGenres={tvGenres.genres}
            state={queryState}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card className="gap-0">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline">
                  {queryState.mediaType === "movie" ? (
                    <FilmIcon data-icon="inline-start" />
                  ) : (
                    <TvMinimalIcon data-icon="inline-start" />
                  )}
                  {queryState.mediaType === "movie" ? "Movie feed" : "TV feed"}
                </Badge>
                <Badge variant="outline">
                  {queryState.mode === "search" ? (
                    <SearchIcon data-icon="inline-start" />
                  ) : (
                    <SparklesIcon data-icon="inline-start" />
                  )}
                  {queryState.mode === "search" ? "Search mode" : "Browse mode"}
                </Badge>
              </div>
              <div className="flex flex-col gap-1">
                <CardTitle>
                  {queryState.mode === "search" ? "TMDB search results" : "TMDB discover results"}
                </CardTitle>
                <CardDescription>
                  {queryState.mode === "search"
                    ? queryState.query
                      ? `Showing title matches for "${queryState.query}".`
                      : "Enter a title query, then apply to fetch TMDB search results."
                    : "Showing discover results for the current filter set."}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {remoteResults ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/20 px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">
                        {remoteResults.total_results.toLocaleString()} TMDB matches
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Page {remoteResults.page} of {Math.min(remoteResults.total_pages, 500)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Search is for title lookup only. Browse is where genre, sort, and decade live.
                    </p>
                  </div>

                  {remoteResults.results.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Genres</TableHead>
                          <TableHead className="w-[188px]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {remoteResults.results.map((result) => {
                          const title = getResultTitle(result);
                          const existingEntry = curatedLookup.get(
                            `${queryState.mediaType}:${result.id}`,
                          );
                          const genres = getResultGenres(result, genreMap);

                          return (
                            <TableRow key={result.id}>
                              <TableCell className="align-top">
                                <div className="flex min-w-0 items-start gap-3">
                                  <PosterThumb title={title} posterPath={result.poster_path} />
                                  <div className="flex min-w-0 flex-col gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="truncate font-medium">{title}</p>
                                      {existingEntry ? (
                                        <Badge
                                          variant={
                                            existingEntry.isPublished ? "default" : "secondary"
                                          }
                                        >
                                          {existingEntry.isPublished ? "Curated" : "Draft"}
                                        </Badge>
                                      ) : null}
                                    </div>
                                    <p className="line-clamp-2 max-w-[48ch] text-xs leading-5 text-muted-foreground">
                                      {result.overview || "No overview available from TMDB."}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      <Badge variant="outline">
                                        {formatReleaseLabel(getResultDate(result))}
                                      </Badge>
                                      <Badge variant="outline">
                                        <StarIcon data-icon="inline-start" />
                                        {formatVoteAverage(result.vote_average)}
                                      </Badge>
                                      {result.original_language ? (
                                        <Badge variant="outline">
                                          {result.original_language.toUpperCase()}
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="align-top">
                                <div className="flex max-w-[220px] flex-wrap gap-2">
                                  {genres.length > 0 ? (
                                    genres.map((genre) => (
                                      <Badge key={genre} variant="secondary">
                                        {genre}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      No genre labels
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="align-top">
                                <div className="flex flex-col gap-2">
                                  <form
                                    action={
                                      existingEntry
                                        ? refreshCuratedEntryAction
                                        : curateTmdbItemAction
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="mediaType"
                                      value={queryState.mediaType}
                                    />
                                    <input type="hidden" name="tmdbId" value={String(result.id)} />
                                    <Button type="submit" size="sm" className="w-full">
                                      <RefreshCcwIcon data-icon="inline-start" />
                                      {existingEntry ? "Refresh snapshot" : "Add to curated"}
                                    </Button>
                                  </form>

                                  {existingEntry ? (
                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                      <span>
                                        {existingEntry.featuredRank
                                          ? `Rank ${existingEntry.featuredRank}`
                                          : "Unranked"}
                                      </span>
                                      <span>
                                        {existingEntry.isPublished ? "Published" : "Hidden"}
                                      </span>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">
                                      Detail data will be fetched before insert.
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center">
                      <p className="font-medium">No TMDB matches found.</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Change the query or switch to browse mode for a wider filter-driven scan.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center">
                  <p className="font-medium">Search mode is waiting for a title query.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Use browse mode when the admin flow starts from genre, decade, or sort order.
                  </p>
                </div>
              )}
            </CardContent>

            {remoteResults && remoteResults.results.length > 0 ? (
              <CardFooter className="justify-center border-t px-6 py-4">
                <PaginationControls
                  currentPage={remoteResults.page}
                  totalPages={remoteResults.total_pages}
                />
              </CardFooter>
            ) : null}
          </Card>

          <Card className="gap-0">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline">Current catalog</Badge>
                <Badge variant="outline">
                  {queryState.mediaType === "movie" ? "Movies only" : "TV only"}
                </Badge>
              </div>
              <div className="flex flex-col gap-1">
                <CardTitle>Curated shelf state</CardTitle>
                <CardDescription>
                  Ordered by featured rank first, then most recently curated. Publish state controls
                  whether the future learner-facing shelf can render the item.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {visibleCuratedEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[220px]">Controls</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleCuratedEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="align-top">
                          <div className="flex min-w-0 items-start gap-3">
                            <PosterThumb title={entry.title} posterPath={entry.posterPath} />
                            <div className="flex min-w-0 flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-medium">{entry.title}</p>
                                <Badge variant="outline">TMDB {entry.tmdbId}</Badge>
                              </div>
                              <p className="line-clamp-2 max-w-[32ch] text-xs leading-5 text-muted-foreground">
                                {entry.overview || "No overview saved."}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  {formatReleaseLabel(entry.releaseDate)}
                                </Badge>
                                <Badge variant="outline">
                                  <StarIcon data-icon="inline-start" />
                                  {formatVoteAverage(entry.voteAverage)}
                                </Badge>
                                {entry.displaySubtitle ? (
                                  <Badge variant="outline">{entry.displaySubtitle}</Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex max-w-[220px] flex-wrap gap-2">
                            <Badge variant={entry.isPublished ? "default" : "secondary"}>
                              {entry.isPublished ? "Published" : "Hidden"}
                            </Badge>
                            <Badge variant="outline">
                              {entry.mediaType === "movie" ? "Movie" : "TV show"}
                            </Badge>
                            {entry.contentRating ? (
                              <Badge variant="outline">{entry.contentRating}</Badge>
                            ) : null}
                            <Badge variant="outline">{formatPopularity(entry.popularity)}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-3">
                            <form
                              action={saveCuratedEntryFeaturedRankAction}
                              className="flex items-center gap-2"
                            >
                              <input type="hidden" name="id" value={entry.id} />
                              <Input
                                type="number"
                                name="featuredRank"
                                min={1}
                                max={999}
                                defaultValue={entry.featuredRank ?? ""}
                                placeholder="Rank"
                              />
                              <Button type="submit" size="sm" variant="outline">
                                Save
                              </Button>
                            </form>

                            <div className="flex flex-wrap gap-2">
                              <form action={setCuratedEntryPublishedAction}>
                                <input type="hidden" name="id" value={entry.id} />
                                <input
                                  type="hidden"
                                  name="isPublished"
                                  value={entry.isPublished ? "false" : "true"}
                                />
                                <Button type="submit" size="sm" variant="outline">
                                  {entry.isPublished ? (
                                    <EyeOffIcon data-icon="inline-start" />
                                  ) : (
                                    <EyeIcon data-icon="inline-start" />
                                  )}
                                  {entry.isPublished ? "Hide" : "Publish"}
                                </Button>
                              </form>

                              <form action={refreshCuratedEntryAction}>
                                <input type="hidden" name="mediaType" value={entry.mediaType} />
                                <input type="hidden" name="tmdbId" value={String(entry.tmdbId)} />
                                <Button type="submit" size="sm" variant="outline">
                                  <RefreshCcwIcon data-icon="inline-start" />
                                  Refresh
                                </Button>
                              </form>

                              <form action={deleteCuratedEntryAction}>
                                <input type="hidden" name="id" value={entry.id} />
                                <Button type="submit" size="sm" variant="destructive">
                                  <Trash2Icon data-icon="inline-start" />
                                  Remove
                                </Button>
                              </form>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center">
                  <p className="font-medium">
                    No curated {queryState.mediaType === "movie" ? "movies" : "TV shows"} yet.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Use the result feed to add the first titles. Ordering and publish state will
                    appear here immediately after insert.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
