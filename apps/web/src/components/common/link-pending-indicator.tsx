"use client";

import { Loader2 } from "lucide-react";
import { useLinkStatus } from "next/link";

import { useReportNavigationPending } from "@/components/common/navigation-progress";
import { cn } from "@/lib/ui/cn";

type LinkPendingIndicatorProps = {
  className?: string;
  /** Screen-reader label announced while the navigation is pending. */
  label?: string;
};

/**
 * Inline spinner for `next/link` navigations. Must be rendered as a descendant of the
 * `<Link>` it belongs to, because `useLinkStatus` reads the nearest link transition.
 * The slot keeps a fixed size so showing the spinner never shifts layout.
 */
export function LinkPendingIndicator({
  className,
  label = "Loading page",
}: LinkPendingIndicatorProps) {
  const { pending } = useLinkStatus();

  useReportNavigationPending(pending);

  return (
    <span
      className={cn("inline-flex size-3.5 shrink-0 items-center justify-center", className)}
      aria-hidden={!pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          <span className="sr-only">{label}</span>
        </>
      ) : null}
    </span>
  );
}
