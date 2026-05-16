/** Build a paginated query string from a base parameter map and a page number. */
export function buildPageUrl(
  baseParams: Record<string, string | number | null | undefined>,
  page: number,
): string {
  const entries = Object.entries({ ...baseParams, page: String(page) }).filter(
    ([, v]) => v != null && v !== "",
  ) as [string, string][];
  return `?${new URLSearchParams(entries).toString()}`;
}
