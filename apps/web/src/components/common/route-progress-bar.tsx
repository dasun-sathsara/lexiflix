"use client";

import { useNavigationProgress } from "@/components/common/navigation-progress";
import { cn } from "@/lib/ui/cn";

/**
 * Thin indeterminate bar pinned to the top of the app shell. Visible while any navigation,
 * filter, or search transition tracked by `NavigationProgressProvider` is pending.
 */
export function RouteProgressBar({ className }: { className?: string }) {
  const { isNavigating } = useNavigationProgress();

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden transition-opacity duration-200",
          isNavigating ? "opacity-100" : "opacity-0",
          className,
        )}
      >
        <div className="h-full w-1/3 animate-route-progress rounded-full bg-primary" />
      </div>
      <output aria-live="polite" className="sr-only">
        {isNavigating ? "Loading" : ""}
      </output>
    </>
  );
}
