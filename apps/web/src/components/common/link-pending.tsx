"use client";

import { useLinkStatus } from "next/link";

import { useReportNavigationPending } from "@/components/common/navigation-progress";

/**
 * Headless reporter for `next/link` navigations. Must be rendered as a descendant of the
 * `<Link>` it belongs to, because `useLinkStatus` reads the nearest link transition.
 *
 * It renders nothing: link navigations are surfaced by the single global
 * `RouteProgressBar`, so links stay visually untouched and no extra DOM node can disturb
 * layout-sensitive parents (for example the collapsed sidebar, which hides the last child
 * span of a menu button).
 */
export function LinkPending() {
  const { pending } = useLinkStatus();

  useReportNavigationPending(pending);

  return null;
}
