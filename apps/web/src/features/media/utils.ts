type ContentMediaReference = {
  kind: string;
  tmdbMovieId: number | null;
  tmdbShowId: number | null;
  tmdbSeasonNumber: number | null;
};

export function buildContentMediaHref(
  row: ContentMediaReference,
  options: { fallbackSeasonNumber?: number } = {},
) {
  if (row.kind === "movie" && row.tmdbMovieId) {
    return `/media/${row.tmdbMovieId}?type=movie`;
  }

  const seasonNumber = row.tmdbSeasonNumber ?? options.fallbackSeasonNumber ?? null;
  if (row.kind === "season" && row.tmdbShowId && seasonNumber) {
    return `/media/${row.tmdbShowId}?type=tv&season=${seasonNumber}`;
  }

  return null;
}

export function getLanguageName(code: string): string {
  try {
    const display = new Intl.DisplayNames(["en"], { type: "language" });
    return display.of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

export function getCountryName(code: string): string {
  try {
    const display = new Intl.DisplayNames(["en"], { type: "region" });
    return display.of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}
