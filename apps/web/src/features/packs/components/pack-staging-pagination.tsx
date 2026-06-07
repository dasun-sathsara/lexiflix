"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPageWindow, PACK_STAGING_PAGE_SIZES } from "@/features/packs/lib/pagination";
import { cn } from "@/lib/ui/cn";

export type PackStagingPaginationProps = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

/**
 * Page navigation and page-size controls for the staged flashcard list. Pagination is
 * client-side state, so navigation uses buttons rather than links.
 */
export function PackStagingPagination({
  page,
  pageSize,
  totalPages,
  totalItems,
  disabled = false,
  onPageChange,
  onPageSizeChange,
}: PackStagingPaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  const pageWindow = getPageWindow(page, totalPages);
  const hasMultiplePages = totalPages > 1;

  return (
    <nav
      aria-label="Flashcard pagination"
      className="flex flex-col gap-3 rounded-[calc(var(--radius)+2px)] border bg-card/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Cards per page</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number.parseInt(value, 10))}
          disabled={disabled}
        >
          <SelectTrigger size="sm" className="h-8 w-[84px]" aria-label="Cards per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PACK_STAGING_PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasMultiplePages ? (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2"
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="size-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          {pageWindow.map((entry, index) =>
            entry === null ? (
              <span
                // Gaps only appear on the leading/trailing edge of the window.
                key={index === 1 ? "gap-start" : "gap-end"}
                aria-hidden="true"
                className="px-1 text-xs text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={entry}
                variant={entry === page ? "outline" : "ghost"}
                size="sm"
                className={cn("size-8 px-0 tabular-nums", entry === page && "font-semibold")}
                onClick={() => onPageChange(entry)}
                disabled={disabled}
                aria-label={`Go to page ${entry}`}
                aria-current={entry === page ? "page" : undefined}
              >
                {entry}
              </Button>
            ),
          )}

          <Button
            variant="ghost"
            size="sm"
            className="gap-1 px-2"
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= totalPages}
            aria-label="Go to next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      ) : null}

      <p className="text-xs tabular-nums text-muted-foreground">
        Page {page} of {totalPages}
      </p>
    </nav>
  );
}
