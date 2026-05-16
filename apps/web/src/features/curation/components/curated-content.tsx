import { Sparkles } from "lucide-react";

import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { AppEmptyState } from "@/components/common/app-surface";
import { FeaturedSpotlight } from "@/features/curation/components/featured-spotlight";
import { LevelTuningBanner } from "@/features/curation/components/level-tuning-banner";
import { MoviePosterGrid } from "@/features/curation/components/movie-poster-grid";
import { TvShowRows } from "@/features/curation/components/tv-show-rows";
import type { CuratedCatalogEntry } from "@/features/curation/types";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import type { StoredCefrLevel } from "@/lib/server/db/json-contracts";

interface CuratedContentProps {
  activeLevel: StoredCefrLevel;
  userLevel: string | null;
  featuredEntry: CuratedCatalogEntry | null;
  movieEntries: CuratedCatalogEntry[];
  tvEntries: CuratedCatalogEntry[];
}

export function CuratedContent({
  activeLevel,
  userLevel,
  featuredEntry,
  movieEntries,
  tvEntries,
}: CuratedContentProps) {
  return (
    <>
      <AppTopbar title="Curated" />
      <AppPageShell>
        <section>
          <AppPageHeader
            heading="Curated Picks"
            description={`Hand-picked recommendations suited for level ${activeLevel}`}
          />
        </section>

        {!userLevel && <LevelTuningBanner />}

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
