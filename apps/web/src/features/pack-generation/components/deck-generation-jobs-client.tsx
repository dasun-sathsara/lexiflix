"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listDeckGenerationJobsAction } from "../server/actions";
import type { PackGenerationProgressView } from "../types";

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function DeckGenerationJobsClient({
  initialJobs,
}: {
  initialJobs: PackGenerationProgressView[];
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [isPending, startTransition] = useTransition();
  const hasActiveJobs = jobs.some((job) => job.status === "queued" || job.status === "running");

  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = window.setInterval(() => {
      startTransition(async () => {
        const result = await listDeckGenerationJobsAction();
        if (result.success) setJobs(result.jobs);
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [hasActiveJobs]);

  if (jobs.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Generation Jobs</h2>
          <p className="text-sm text-muted-foreground">Active and recent pack-generation state.</p>
        </div>
        {isPending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>
      <div className="space-y-2">
        {jobs.map((job) => {
          const isActive = job.status === "queued" || job.status === "running";
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
                  <Badge variant={isActive ? "default" : "secondary"}>
                    {formatLabel(job.status)}
                  </Badge>
                  <Badge variant="outline">{formatLabel(job.stage)}</Badge>
                </div>
                <p className="truncate font-medium">{job.content.title}</p>
                <p className="text-sm text-muted-foreground">
                  {job.progressMessage ?? "Generation state is available."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {job.packHref ? (
                  <Button size="sm" asChild>
                    <Link href={job.packHref}>
                      <CheckCircle2 className="size-4" />
                      Open pack
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
                    Progress
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
