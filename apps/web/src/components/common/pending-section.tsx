"use client";

import type * as React from "react";

import { useNavigationProgress } from "@/components/common/navigation-progress";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/ui/cn";

type PendingSectionProps = {
  children: React.ReactNode;
  /**
   * Explicit pending flag. When omitted the section follows the app-wide navigation
   * progress state, which lets server-rendered sections react to client filter changes.
   */
  pending?: boolean;
  /** Renders a centered spinner overlay in addition to dimming the content. */
  showSpinner?: boolean;
  className?: string;
};

/**
 * Dims and freezes a section while its data is being refreshed, and announces the busy
 * state to assistive technology.
 */
export function PendingSection({
  children,
  pending,
  showSpinner = true,
  className,
}: PendingSectionProps) {
  const { isNavigating } = useNavigationProgress();
  const isPending = pending ?? isNavigating;

  return (
    <div
      aria-busy={isPending}
      aria-live="polite"
      className={cn("relative transition-opacity duration-200", className)}
    >
      <div
        className={cn(
          "transition-opacity duration-200",
          isPending && "pointer-events-none select-none opacity-50",
        )}
      >
        {children}
      </div>
      {isPending && showSpinner ? (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-10">
          <LoadingSpinner size="md" className="text-muted-foreground" />
        </div>
      ) : null}
      <span className="sr-only">{isPending ? "Updating results" : ""}</span>
    </div>
  );
}
