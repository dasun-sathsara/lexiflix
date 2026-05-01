"use client";

import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
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
import { listGenerationJobsAction } from "../server/actions";
import type { PackGenerationProgressView } from "../types";

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
          const status = getGenerationStatusCopy(job.status);
          const isActive = isGenerationActive(job.status);
          const isFailed = job.status === "failed";
          const hasMissingPack = job.status === "completed" && !job.packHref;
          return (
            <div
              key={job.jobId}
              className={cn(
                "flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between",
                isFailed && "border-rose-200/70 bg-rose-500/10 dark:border-rose-500/20",
                hasMissingPack && "border-amber-200/70 bg-amber-500/10 dark:border-amber-500/20",
              )}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={isActive || status.tone === "success" ? "default" : "secondary"}
                    className={cn(
                      status.tone === "danger" && "bg-rose-600 text-white hover:bg-rose-600/90",
                      status.tone === "success" &&
                        "bg-emerald-600 text-white hover:bg-emerald-600/90",
                    )}
                  >
                    {status.label}
                  </Badge>
                  <Badge variant="outline">{formatGenerationLabel(job.stage)}</Badge>
                </div>
                <p className="truncate font-medium">{job.content.title}</p>
                <p className="text-sm text-muted-foreground">{getGenerationStatusMessage(job)}</p>
                {job.errorMessage ? (
                  <p className="line-clamp-2 text-sm text-rose-700 dark:text-rose-300">
                    {job.errorMessage}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {job.packHref ? (
                  <Button size="sm" asChild>
                    <Link href={job.packHref}>
                      <CheckCircle2 className="size-4" />
                      Open Pack
                    </Link>
                  </Button>
                ) : null}
                {isActive ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={job.progressHref}>
                      <Clock className="size-4" />
                      View Progress
                    </Link>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant={isFailed || hasMissingPack ? "default" : "outline"}
                  asChild
                >
                  <Link href={job.progressHref}>
                    {isFailed || hasMissingPack ? <AlertTriangle className="size-4" /> : null}
                    {isFailed || hasMissingPack ? "Review Job" : "Job Details"}
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
