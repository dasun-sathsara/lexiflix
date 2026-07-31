"use client";

import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { useReportNavigationPending } from "@/components/common/navigation-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminUsersQueryState } from "@/features/admin-users/types";
import { buildAdminUsersHref } from "@/features/admin-users/utils";

const SEARCH_DEBOUNCE_MS = 400;

type AdminUsersSearchProps = {
  queryState: AdminUsersQueryState;
  isFiltered: boolean;
};

/**
 * Debounced user search. Keeps a real form so Enter commits immediately and the control
 * still works as a plain GET form when JavaScript has not hydrated yet.
 */
export function AdminUsersSearch({ queryState, isFiltered }: AdminUsersSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(queryState.query);
  const [isPending, startTransition] = useTransition();
  const committedQueryRef = useRef(queryState.query);

  const isDirty = query.trim() !== queryState.query;
  const isBusy = isPending || isDirty;

  useReportNavigationPending(isBusy);

  useEffect(() => {
    if (committedQueryRef.current !== queryState.query) {
      committedQueryRef.current = queryState.query;
      setQuery(queryState.query);
    }
  }, [queryState.query]);

  function commit(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (trimmed === queryState.query) {
      return;
    }

    committedQueryRef.current = trimmed;
    startTransition(() => {
      router.push(buildAdminUsersHref(queryState, { query: trimmed, page: 1 }));
    });
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === queryState.query) {
      return;
    }

    const timer = setTimeout(() => {
      committedQueryRef.current = trimmed;
      startTransition(() => {
        router.push(buildAdminUsersHref(queryState, { query: trimmed, page: 1 }));
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, queryState, router]);

  return (
    <form
      action="/admin/users"
      className="flex min-w-0 flex-1 items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        commit(query);
      }}
      aria-busy={isBusy}
    >
      {queryState.status !== "all" ? (
        <input type="hidden" name="status" value={queryState.status} />
      ) : null}
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <label htmlFor="admin-user-search" className="sr-only">
          Search users by name or email
        </label>
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="admin-user-search"
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          className="h-9 pl-8 pr-9"
          maxLength={100}
        />
        {isBusy ? (
          <Loader2
            className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
        Search
      </Button>
      {isFiltered ? (
        <Button asChild size="sm" variant="ghost">
          <Link href="/admin/users">Clear</Link>
        </Button>
      ) : null}
    </form>
  );
}
