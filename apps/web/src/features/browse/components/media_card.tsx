import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { IMAGE_BASE_URL, TMDB_IMAGE_SIZES, type TMDBResult } from "@/lib/tmdb-shared";

interface MediaCardProps {
  media: TMDBResult;
  genreMap: Record<number, string>;
}

export function MediaCard({ media, genreMap }: MediaCardProps) {
  // Infer type if missing (common in discover endpoints)
  const isMovie = media.media_type === "movie" || (!media.media_type && !!media.title);
  const title = media.title || media.name || "Untitled";
  const date = media.release_date || media.first_air_date;
  const year = date ? new Date(date).getFullYear() : "Unknown";
  const posterUrl = media.poster_path
    ? `${IMAGE_BASE_URL}${TMDB_IMAGE_SIZES.poster.md}${media.poster_path}`
    : null;

  const genres = media.genre_ids
    .slice(0, 2)
    .map((id) => genreMap[id])
    .filter(Boolean);

  return (
    <Link href={`/media/${media.id}`} className="group block h-full">
      <Card className="h-full overflow-hidden p-1 gap-2 border border-transparent bg-transparent transition-all duration-300 group-hover:scale-[1.03] group-hover:border-indigo-200/40 group-hover:shadow-lg group-hover:shadow-indigo-500/5 dark:group-hover:border-indigo-500/20">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={title}
              fill
              className="object-cover transition-opacity duration-300 group-hover:opacity-90"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
              {title}
            </div>
          )}
          <div className="absolute right-2 top-2">
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
            >
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {media.vote_average.toFixed(1)}
            </Badge>
          </div>
        </div>

        <CardContent className="p-2">
          <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-foreground group-hover:text-primary">
            {title}
          </h3>
          <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {year} • {isMovie ? "Movie" : "TV"}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {genres.map((genre) => (
              <Badge
                key={genre}
                variant="secondary"
                className="h-5 px-1.5 text-[10px] border border-indigo-200/60 bg-indigo-500/10 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-950/30 dark:text-indigo-200"
              >
                {genre}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
