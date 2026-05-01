import Link from "next/link";

import { Button } from "@/components/ui/button";

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

/** Skeleton placeholder for the admin discovery controls card. */
export function ControlsSkeleton() {
  return (
    <div className="h-[184px] animate-pulse rounded-[calc(var(--radius)+2px)] border bg-card/50" />
  );
}

/** Skeleton placeholder for the admin browse filters card. */
export function FiltersSkeleton() {
  return (
    <div className="h-[132px] animate-pulse rounded-[calc(var(--radius)+2px)] border bg-card/50" />
  );
}

/** Previous / next pagination row for admin catalog and discovery views. */
export function PaginationRow({
  currentPage,
  totalPages,
  baseParams,
}: {
  currentPage: number;
  totalPages: number;
  baseParams: Record<string, string | number | null | undefined>;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      <div>
        {currentPage > 1 && (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildPageUrl(baseParams, currentPage - 1)}>← Previous</Link>
          </Button>
        )}
      </div>

      <span className="text-sm text-muted-foreground">
        Page {currentPage} / {totalPages}
      </span>

      <div>
        {currentPage < totalPages && (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildPageUrl(baseParams, currentPage + 1)}>Next →</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
