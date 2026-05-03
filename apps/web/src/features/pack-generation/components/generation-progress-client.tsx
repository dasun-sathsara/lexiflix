"use client";

import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatGenerationLabel,
  getGenerationStatusCopy,
  getGenerationStatusMessage,
  isGenerationActive,
} from "../lib/status";
import { getPackGenerationProgressAction, retryPackGenerationAction } from "../server/actions";
import type { PackGenerationProgressView } from "../types";

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : null;
}

function formatRelativeTime(value: string | null) {
  if (!value) return null;
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return formatDate(value);
}

function dedupeWarnings(warnings: string[]): { message: string; count: number }[] {
  const map = new Map<string, number>();
  for (const w of warnings) map.set(w, (map.get(w) ?? 0) + 1);
  return Array.from(map.entries()).map(([message, count]) => ({ message, count }));
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function GenerationProgressClient({
  initialGeneration,
}: {
  initialGeneration: PackGenerationProgressView;
}) {
  const [generation, setGeneration] = useState(initialGeneration);
  const [isPending, startTransition] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);

  const status = getGenerationStatusCopy(generation.status);
  const isActive = isGenerationActive(generation.status);
  const isFailed = generation.status === "failed";
  const isCompleted = generation.status === "completed";
  const uniqueWarnings = dedupeWarnings(generation.warnings);

  useEffect(() => {
    if (!isActive) return;
    const timer = window.setInterval(() => {
      startTransition(async () => {
        const result = await getPackGenerationProgressAction({
          jobId: generation.jobId,
          includeEvents: true,
        });
        if (result.ok) setGeneration(result.data.generation);
      });
    }, 3500);
    return () => window.clearInterval(timer);
  }, [generation.jobId, isActive]);

  function handleRetry() {
    setRetryError(null);
    startTransition(async () => {
      const result = await retryPackGenerationAction({ jobId: generation.jobId });
      if (result.ok) setGeneration(result.data.generation);
      else setRetryError(result.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
      {/* ── Left sidebar ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Status card */}
        <div
          className={cn(
            "rounded-xl border bg-card p-4 shadow-xs space-y-3",
            isFailed && "border-rose-200/60 bg-rose-500/[0.04] dark:border-rose-500/20",
            isCompleted && "border-emerald-200/60 bg-emerald-500/[0.04] dark:border-emerald-500/20",
            isActive && "border-blue-200/60 bg-blue-500/[0.03] dark:border-blue-500/20",
          )}
        >
          {/* Poster + title */}
          <div className="flex items-start gap-3">
            {generation.content.posterUrl ? (
              <div className="relative h-18 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted shadow-sm">
                <Image
                  src={generation.content.posterUrl}
                  alt={generation.content.title}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="min-w-0 space-y-1">
              <Badge
                variant={isActive || isCompleted ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  isFailed && "bg-rose-600 text-white hover:bg-rose-600/90",
                  isCompleted && "bg-emerald-600 text-white hover:bg-emerald-600/90",
                  isActive && "bg-blue-600 text-white hover:bg-blue-600/90",
                )}
              >
                {isActive ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3 animate-spin" />
                    {status.label}
                  </span>
                ) : (
                  status.label
                )}
              </Badge>
              <p className="text-sm font-semibold leading-snug">{generation.content.title}</p>
              {generation.content.subtitle ? (
                <p className="text-xs text-muted-foreground">{generation.content.subtitle}</p>
              ) : null}
            </div>
          </div>

          {/* Status message */}
          <p className="text-xs text-muted-foreground">
            {getGenerationStatusMessage(generation)}
            {isPending ? <Loader2 className="inline ml-1.5 size-3 animate-spin" /> : null}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-1.5">
            {generation.packHref ? (
              <Button size="sm" className="w-full" asChild>
                <Link href={generation.packHref}>
                  <CheckCircle2 className="size-3.5" />
                  Open Pack
                </Link>
              </Button>
            ) : null}
            {isFailed ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleRetry}
                disabled={isPending}
              >
                <RefreshCw className="size-3.5" />
                Retry generation
              </Button>
            ) : null}
            {generation.content.mediaHref ? (
              <Button size="sm" variant="ghost" className="w-full text-muted-foreground" asChild>
                <Link href={generation.content.mediaHref}>
                  <ExternalLink className="size-3.5" />
                  View media page
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Timestamps */}
        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Timeline
          </p>
          <div className="space-y-2">
            <MetaRow label="Created" value={formatDate(generation.createdAt) ?? "—"} />
            <MetaRow label="Started" value={formatDate(generation.startedAt) ?? "—"} />
            <MetaRow label="Completed" value={formatDate(generation.completedAt) ?? "—"} />
          </div>
          <p className="text-xs text-muted-foreground/40 break-all pt-1">{generation.jobId}</p>
        </div>

        {/* Generation request params */}
        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Request
          </p>
          <div className="space-y-2">
            <MetaRow label="Pack size" value={generation.request.packSize} />
            <MetaRow label="CEFR" value={generation.request.learnerCefrLevel ?? "Any"} />
            <MetaRow
              label="Window"
              value={formatGenerationLabel(generation.request.cefrWindowMode)}
            />
            <MetaRow
              label="Known terms"
              value={formatGenerationLabel(generation.request.knownTermHandling)}
            />
          </div>
          {generation.request.selectedVocabularyTypes.length > 0 ? (
            <div className="space-y-1.5 pt-0.5">
              <p className="text-xs text-muted-foreground">Vocabulary types</p>
              <div className="flex flex-wrap gap-1">
                {generation.request.selectedVocabularyTypes.map((kind) => (
                  <Badge key={kind} variant="secondary" className="text-xs">
                    {formatGenerationLabel(kind)}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Alerts */}
        {isFailed || retryError || uniqueWarnings.length > 0 ? (
          <div className="space-y-2">
            {isFailed ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-rose-200/60 bg-rose-500/[0.06] px-3.5 py-3 text-sm dark:border-rose-500/20">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium text-rose-900 dark:text-rose-200">
                    {getGenerationStatusMessage(generation)}
                  </p>
                  {generation.errorMessage ? (
                    <p className="text-xs text-rose-800/80 dark:text-rose-300/80">
                      {generation.errorMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {retryError ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-rose-200/60 bg-rose-500/[0.06] px-3.5 py-3 text-sm dark:border-rose-500/20">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <p className="text-xs font-medium text-rose-900 dark:text-rose-200">
                  Retry failed: {retryError}
                </p>
              </div>
            ) : null}
            {uniqueWarnings.length > 0 ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200/60 bg-amber-500/[0.06] px-3.5 py-3 text-sm dark:border-amber-500/20">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-amber-900 dark:text-amber-200">
                    {uniqueWarnings.length === 1 ? "Warning" : `${uniqueWarnings.length} warnings`}
                  </p>
                  <ul className="space-y-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                    {uniqueWarnings.map(({ message, count }) => (
                      <li key={message}>
                        {message}
                        {count > 1 ? (
                          <span className="ml-1.5 rounded bg-amber-500/15 px-1 py-px font-medium">
                            ×{count}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ── Right: Event Trail ─────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card shadow-xs">
        <div className="flex items-center justify-between gap-4 border-b px-5 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Event Trail
          </p>
          {generation.events.length > 0 ? (
            <span className="text-xs text-muted-foreground tabular-nums">
              {generation.events.length} {generation.events.length === 1 ? "event" : "events"}
            </span>
          ) : null}
        </div>

        <div className="px-5 py-4">
          {generation.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events recorded yet.</p>
          ) : (
            <ol className="relative ml-1.5 border-l border-border/60">
              {generation.events.map((event, i) => {
                const isFirst = i === 0;
                const dotClass = isFirst
                  ? isActive
                    ? "bg-blue-500 ring-4 ring-blue-500/20"
                    : isFailed
                      ? "bg-rose-500"
                      : "bg-emerald-500"
                  : "bg-muted-foreground/25";

                return (
                  <li key={event.id} className="ml-5 pb-6 last:pb-0">
                    <span
                      className={cn(
                        "absolute -left-[5px] mt-1 size-2.5 rounded-full border-2 border-background",
                        dotClass,
                      )}
                    />
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-medium leading-snug">
                        {formatGenerationLabel(event.stage)}
                      </p>
                      <time className="shrink-0 text-xs text-muted-foreground/50 tabular-nums">
                        {formatRelativeTime(event.createdAt)}
                      </time>
                    </div>
                    {event.message ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{event.message}</p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
