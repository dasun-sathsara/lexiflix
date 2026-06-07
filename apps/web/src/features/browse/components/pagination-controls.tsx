"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { LinkPendingIndicator } from "@/components/common/link-pending-indicator";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
}

export function PaginationControls({ currentPage, totalPages }: PaginationControlsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // TMDB Limit
  const maxPage = Math.min(totalPages, 500);

  const createPageURL = useCallback(
    (pageNumber: number | string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", pageNumber.toString());
      return `${pathname}?${params.toString()}`;
    },
    [searchParams, pathname],
  );

  if (maxPage <= 1) return null;

  // Re-write logic cleanly
  const renderPageItems = () => {
    const items = [];
    let ellipsisKey = 0;

    // Always show Prev
    if (currentPage > 1) {
      items.push(
        <PaginationItem key="prev">
          <PaginationLink
            href={createPageURL(currentPage - 1)}
            size="default"
            aria-label="Go to previous page"
            className="gap-1 px-2.5"
          >
            <ChevronLeftIcon />
            <span className="hidden sm:block">Previous</span>
            <LinkPendingIndicator label="Loading previous page" />
          </PaginationLink>
        </PaginationItem>,
      );
    }

    const pages = [];
    if (maxPage <= 7) {
      for (let i = 1; i <= maxPage; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", maxPage);
      } else if (currentPage >= maxPage - 3) {
        pages.push(1, "...", maxPage - 4, maxPage - 3, maxPage - 2, maxPage - 1, maxPage);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", maxPage);
      }
    }

    pages.forEach((p) => {
      if (p === "...") {
        ellipsisKey += 1;
        items.push(
          <PaginationItem key={`ellipsis-${ellipsisKey}`}>
            <PaginationEllipsis />
          </PaginationItem>,
        );
      } else {
        items.push(
          <PaginationItem key={p}>
            <PaginationLink
              href={createPageURL(p)}
              isActive={p === currentPage}
              size="default"
              className="gap-1"
            >
              {p}
              <LinkPendingIndicator label={`Loading page ${p}`} />
            </PaginationLink>
          </PaginationItem>,
        );
      }
    });

    // Next
    if (currentPage < maxPage) {
      items.push(
        <PaginationItem key="next">
          <PaginationLink
            href={createPageURL(currentPage + 1)}
            size="default"
            aria-label="Go to next page"
            className="gap-1 px-2.5"
          >
            <span className="hidden sm:block">Next</span>
            <ChevronRightIcon />
            <LinkPendingIndicator label="Loading next page" />
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return items;
  };

  return (
    <Pagination>
      <PaginationContent>{renderPageItems()}</PaginationContent>
    </Pagination>
  );
}
