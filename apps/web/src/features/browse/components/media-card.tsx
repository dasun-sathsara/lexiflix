import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES, type TMDBResult } from "@/lib/tmdb-shared";

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
  const posterUrl = buildTmdbImageUrl(media.poster_path, TMDB_IMAGE_SIZES.poster.md);

  const genres = media.genre_ids
    .slice(0, 2)
    .map((id) => genreMap[id])
    .filter(Boolean);

  return (
    <Link
      href={`/media/${media.id}?type=${isMovie ? "movie" : "tv"}`}
      className="group block h-full"
    >
      <Card className="h-full gap-2.5 overflow-hidden p-1.5 transition-colors duration-200 ease-out group-hover:border-primary/25 group-hover:bg-muted/30">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-muted">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
              {title}
            </div>
          )}
          <div className="absolute right-2 top-2">
            <Badge
              variant="outline"
              className="border-white/15 bg-black/60 text-white backdrop-blur-sm"
            >
              <Star className="size-3 fill-yellow-400 text-yellow-400" />
              {media.vote_average.toFixed(1)}
            </Badge>
          </div>
        </div>

        <CardContent className="px-1.5 pb-1">
          <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-foreground transition-colors duration-200 group-hover:text-primary">
            {title}
          </h3>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {year} • {isMovie ? "Movie" : "TV"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {genres.map((genre) => (
              <Badge key={genre} variant="secondary">
                {genre}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
