import type { TMDBResult } from "@/lib/tmdb-shared";
import { MediaCard } from "./media-card";

interface MediaGridProps {
  results: TMDBResult[];
  genreMap: Record<number, string>;
}

export function MediaGrid({ results, genreMap }: MediaGridProps) {
  if (!results || !results.length) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-[calc(var(--radius)+2px)] border border-dashed bg-card/70 px-6 text-center text-sm text-muted-foreground">
        No results found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {results.map((media) => (
        <MediaCard key={media.id} media={media} genreMap={genreMap} />
      ))}
    </div>
  );
}
