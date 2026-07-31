"use client";

import type * as React from "react";

import { useNavigationProgress } from "@/components/common/navigation-progress";
import { cn } from "@/lib/ui/cn";

type PendingSectionProps = {
  children: React.ReactNode;
  /**
   * Explicit pending flag. When omitted the section follows the app-wide navigation
   * progress state, which lets server-rendered sections react to client filter changes.
   */
  pending?: boolean;
  className?: string;
};

/**
 * Dims and freezes a section while its data is being refreshed. Deliberately has no
 * spinner of its own: the global `RouteProgressBar` already reports that something is
 * loading, so the section only needs to read as stale.
 */
export function PendingSection({ children, pending, className }: PendingSectionProps) {
  const { isNavigating } = useNavigationProgress();
  const isPending = pending ?? isNavigating;

  return (
    <div
      aria-busy={isPending}
      className={cn(
        "transition-opacity duration-200 motion-reduce:transition-none",
        isPending && "pointer-events-none select-none opacity-60",
        className,
      )}
    >
      {children}
    </div>
  );
}
