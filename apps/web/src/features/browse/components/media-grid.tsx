import type { TMDBResult } from "@/lib/tmdb";
import { MediaCard } from "./media-card";

interface MediaGridProps {
  results: TMDBResult[];
  genreMap: Record<number, string>;
}

export function MediaGrid({ results, genreMap }: MediaGridProps) {
  if (!results || !results.length) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-muted-foreground">
        No results found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {results.map((media) => (
        <MediaCard key={media.id} media={media} genreMap={genreMap} />
      ))}
    </div>
  );
}
