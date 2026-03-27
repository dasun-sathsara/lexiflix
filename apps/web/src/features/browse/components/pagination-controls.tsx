"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
}

export function PaginationControls({ currentPage, totalPages }: PaginationControlsProps) {
  const router = useRouter();
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

    // Always show Prev
    if (currentPage > 1) {
      items.push(
        <PaginationItem key="prev">
          <PaginationPrevious href={createPageURL(currentPage - 1)} />
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

    pages.forEach((p, idx) => {
      if (p === "...") {
        items.push(
          <PaginationItem key={`ellipsis-${idx}`}>
            <PaginationEllipsis />
          </PaginationItem>,
        );
      } else {
        items.push(
          <PaginationItem key={p}>
            <PaginationLink href={createPageURL(p)} isActive={p === currentPage}>
              {p}
            </PaginationLink>
          </PaginationItem>,
        );
      }
    });

    // Next
    if (currentPage < maxPage) {
      items.push(
        <PaginationItem key="next">
          <PaginationNext href={createPageURL(currentPage + 1)} />
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
