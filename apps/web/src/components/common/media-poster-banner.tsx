import Image from "next/image";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type MediaPosterBannerProps = {
  /** Optional backdrop image URL rendered behind the banner content. */
  backdropUrl?: string | null;
  /** Accessible alt text for the backdrop image. */
  backdropAlt?: string;
  /** Row of badges shown above the title (media kind, CEFR level, etc.). */
  badges?: ReactNode;
  /** Main title rendered as the H1. */
  title: ReactNode;
  /** Inline meta line shown directly under the title. */
  meta?: ReactNode;
  /** Additional content rendered in the primary column (genre chips, progress bar, etc.). */
  children?: ReactNode;
  /** Optional right-aligned actions (CTAs). */
  actions?: ReactNode;
  /** Extra classes merged onto the outer Card. */
  className?: string;
};

/**
 * Shared poster-style banner used across media surfaces (pack staging, media detail, etc.).
 *
 * Provides a consistent backdrop, gradient overlay, and content scaffolding so that every
 * media-centric surface in the app shares the same hero appearance.
 *
 * Visual recipe:
 * - Backdrop image fills the card.
 * - Theme-aware bottom gradient guarantees text contrast for the grouped content area
 *   while leaving the top of the backdrop unobscured.
 * - Badges, title, meta, children, and actions all live in a single bottom-anchored row.
 */
export function MediaPosterBanner({
  backdropUrl,
  backdropAlt,
  badges,
  title,
  meta,
  children,
  actions,
  className,
}: MediaPosterBannerProps) {
  return (
    <Card
      className={cn(
        "relative isolate min-h-[300px] overflow-hidden border-indigo-200/60 bg-muted/40 dark:border-indigo-500/20 sm:min-h-[320px] lg:min-h-[340px]",
        className,
      )}
    >
      {backdropUrl ? (
        <div className="absolute inset-0 -z-10">
          <Image
            src={backdropUrl}
            alt={backdropAlt ?? ""}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
          />
          {/* Theme-aware bottom gradient. Lightly veils the upper portion of the
                        backdrop and concentrates contrast at the bottom where content lives. */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/45 to-background/10" />
        </div>
      ) : null}

      <CardContent className="relative flex min-h-[300px] flex-col justify-end gap-3 px-5 pb-2 pt-4 sm:min-h-[320px] sm:px-6 sm:pb-3 sm:pt-5 lg:min-h-[340px]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="min-w-0 space-y-2 lg:max-w-xl">
            {badges ? <div className="flex flex-wrap items-center gap-1.5">{badges}</div> : null}

            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
              {meta ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-foreground/75">
                  {meta}
                </div>
              ) : null}
            </div>

            {children ? <div className="pt-1">{children}</div> : null}
          </div>

          {actions ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{actions}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
