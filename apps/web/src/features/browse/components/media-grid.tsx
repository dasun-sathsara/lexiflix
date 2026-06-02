import { Search } from "lucide-react";
import { AppEmptyState } from "@/components/common/app-surface";
import type { TMDBResult } from "@/lib/integrations/tmdb/contracts";
import { MediaCard } from "./media-card";

interface MediaGridProps {
  results: TMDBResult[];
  genreMap: Record<number, string>;
}

export function MediaGrid({ results, genreMap }: MediaGridProps) {
  if (!results?.length) {
    return (
      <AppEmptyState
        icon={Search}
        title="No titles found"
        description="Try adjusting your search query or selecting a different genre."
      />
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
