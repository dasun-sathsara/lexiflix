"use client";

import { AlertTriangle, CheckCircle2, Clock, Layers, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getGenerationProgressState,
  getGenerationStatusMessage,
  isGenerationActive,
} from "../lib/status";
import { listGenerationJobsAction } from "../server/actions";
import type { PackGenerationProgressView } from "../types";

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function GenerationJobsClient({
  initialJobs,
}: {
  initialJobs: PackGenerationProgressView[];
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [isPending, startTransition] = useTransition();
  const hasActiveJobs = jobs.some((job) => isGenerationActive(job.status));

  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = window.setInterval(() => {
      startTransition(async () => {
        const result = await listGenerationJobsAction();
        if (result.ok) setJobs(result.data.jobs);
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [hasActiveJobs]);

  if (jobs.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Jobs</h2>
          <p className="text-sm text-muted-foreground">Active and recent pack-generation state.</p>
        </div>
        {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>
      <div className="space-y-2">
        {jobs.map((job) => {
          const progress = getGenerationProgressState(job);
          const isActive = isGenerationActive(job.status);
          const isFailed = job.status === "failed";
          const hasMissingPack = job.status === "completed" && !job.packHref;
          const needsAttention = isFailed || hasMissingPack;
          const statusClass = cn(
            "border text-xs font-medium",
            isActive &&
              "border-blue-200/70 bg-blue-500/10 text-blue-700 dark:border-blue-500/20 dark:text-blue-300",
            job.status === "completed" &&
              "border-emerald-200/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/20 dark:text-emerald-300",
            isFailed &&
              "border-rose-200/70 bg-rose-500/10 text-rose-700 dark:border-rose-500/20 dark:text-rose-300",
            job.status === "cancelled" && "border-border bg-muted text-muted-foreground",
          );
          const message = getGenerationStatusMessage(job);

          return (
            <div
              key={job.jobId}
              className={cn(
                "group relative flex flex-col gap-3 rounded-xl border bg-card/70 p-3 shadow-sm transition-colors hover:border-primary/20 hover:bg-card sm:flex-row sm:items-center sm:justify-between",
                needsAttention && "border-rose-200/70 dark:border-rose-500/20",
                hasMissingPack && !isFailed && "border-amber-200/70 dark:border-amber-500/20",
              )}
            >
              {needsAttention ? (
                <div
                  className={cn(
                    "absolute inset-y-3 left-0 w-1 rounded-r-full",
                    isFailed ? "bg-rose-500/60" : "bg-amber-500/60",
                  )}
                />
              ) : null}

              <div className="flex min-w-0 items-start gap-3">
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted shadow-sm">
                  {job.content.posterUrl ? (
                    <Image
                      src={job.content.posterUrl}
                      alt={job.content.title}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground">
                      <Layers className="size-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className={statusClass}>
                      {isActive ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
                      {progress.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(job.updatedAt)}
                    </span>
                  </div>
                  <p className="truncate font-medium leading-tight">{job.content.title}</p>
                  {job.content.subtitle ? (
                    <p className="truncate text-xs text-muted-foreground">{job.content.subtitle}</p>
                  ) : null}
                  <p
                    className={cn(
                      "line-clamp-1 text-sm text-muted-foreground",
                      needsAttention && "text-rose-700 dark:text-rose-300",
                    )}
                  >
                    {message}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                {job.packHref ? (
                  <Button size="sm" className="gap-1.5" asChild>
                    <Link href={job.packHref}>
                      <CheckCircle2 className="size-3.5" />
                      Open Pack
                    </Link>
                  </Button>
                ) : null}
                {isActive ? (
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <Link href={job.progressHref}>
                      <Clock className="size-3.5" />
                      View Progress
                    </Link>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant={needsAttention ? "ghost" : "outline"}
                  className={cn(
                    "gap-1.5",
                    needsAttention &&
                      "text-rose-700 hover:bg-rose-500/10 hover:text-rose-800 dark:text-rose-300",
                  )}
                  asChild
                >
                  <Link href={job.progressHref}>
                    {needsAttention ? <AlertTriangle className="size-3.5" /> : null}
                    {needsAttention ? "Review" : "Details"}
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
