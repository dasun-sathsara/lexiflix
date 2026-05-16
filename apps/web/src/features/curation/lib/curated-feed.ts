import type { CuratedCatalogEntry } from "@/features/curation/types";
import { CEFR_LEVELS } from "@/lib/cefr";
import type { StoredCefrLevel } from "@/lib/server/db/json-contracts";

export function resolveActiveLevel(
  levelParam: string | undefined,
  userLevel: string | null,
): StoredCefrLevel {
  const requestedLevel =
    levelParam && CEFR_LEVELS.includes(levelParam as StoredCefrLevel)
      ? (levelParam as StoredCefrLevel)
      : null;
  return (
    requestedLevel ??
    (userLevel && CEFR_LEVELS.includes(userLevel as StoredCefrLevel)
      ? (userLevel as StoredCefrLevel)
      : "A1")
  );
}

export function partitionCuratedEntries(
  entries: CuratedCatalogEntry[],
  activeLevel: StoredCefrLevel,
) {
  const published = entries.filter((e) => e.level === activeLevel || e.level === null);
  const [featuredEntry, ...restEntries] = published;
  const movieEntries = restEntries.filter((e) => e.mediaType === "movie");
  const tvEntries = restEntries.filter((e) => e.mediaType === "tv");
  return { featuredEntry: featuredEntry ?? null, movieEntries, tvEntries };
}
