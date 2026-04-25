"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  formatGenerationLabel,
  getGenerationStatusCopy,
  getGenerationStatusMessage,
  isGenerationActive,
} from "../lib/status";
import { getPackGenerationProgressAction } from "../server/actions";
import type { PackGenerationProgressView } from "../types";

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "Not recorded";
}

function statusIcon(status: PackGenerationProgressView["status"]) {
  if (status === "completed") return CheckCircle2;
  if (status === "failed" || status === "cancelled") return XCircle;
  if (status === "running") return Loader2;
  return Clock;
}

export function GenerationProgressClient({
  initialGeneration,
}: {
  initialGeneration: PackGenerationProgressView;
}) {
  const [generation, setGeneration] = useState(initialGeneration);
  const [isPending, startTransition] = useTransition();
  const status = getGenerationStatusCopy(generation.status);
  const isActive = isGenerationActive(generation.status);
  const StatusIcon = statusIcon(generation.status);

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

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
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
                <Badge variant="outline">{formatGenerationLabel(generation.stage)}</Badge>
                {isPending ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : null}
              </div>
              <CardTitle className="text-2xl">{generation.content.title}</CardTitle>
              <CardDescription>
                {generation.content.subtitle ?? "Generated vocabulary pack"} · Job{" "}
                <code>{generation.jobId}</code>
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {generation.content.mediaHref ? (
                <Button variant="outline" asChild>
                  <Link href={generation.content.mediaHref}>
                    <ArrowLeft className="size-4" />
                    Media
                  </Link>
                </Button>
              ) : null}
              {generation.packHref ? (
                <Button asChild>
                  <Link href={generation.packHref}>
                    <CheckCircle2 className="size-4" />
                    Open Pack
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4",
              generation.status === "failed"
                ? "border-rose-200 bg-rose-500/10 text-rose-800 dark:border-rose-500/20 dark:text-rose-200"
                : generation.status === "completed"
                  ? "border-emerald-200 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/20 dark:text-emerald-200"
                  : "bg-card",
            )}
          >
            <StatusIcon className={cn("mt-0.5 size-5", isActive && "animate-spin")} />
            <div className="space-y-1">
              <p className="font-medium">{getGenerationStatusMessage(generation)}</p>
              {generation.errorMessage ? (
                <p className="text-sm">{generation.errorMessage}</p>
              ) : null}
            </div>
          </div>

          {generation.warnings.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-500/10 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:text-amber-100">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4" />
                Warnings
              </div>
              <ul className="space-y-1">
                {generation.warnings.slice(0, 4).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium">{formatDate(generation.createdAt)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Started</p>
              <p className="text-sm font-medium">{formatDate(generation.startedAt)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-sm font-medium">{formatDate(generation.completedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Pack size</span>
              <span className="font-medium">{generation.request.packSize}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">CEFR</span>
              <span className="font-medium">{generation.request.learnerCefrLevel ?? "Any"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Window</span>
              <span className="font-medium">
                {formatGenerationLabel(generation.request.cefrWindowMode)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Known terms</span>
              <span className="font-medium">
                {formatGenerationLabel(generation.request.knownTermHandling)}
              </span>
            </div>
            <div className="space-y-2">
              <span className="text-muted-foreground">Vocabulary</span>
              <div className="flex flex-wrap gap-1.5">
                {generation.request.selectedVocabularyTypes.map((kind) => (
                  <Badge key={kind} variant="secondary">
                    {formatGenerationLabel(kind)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Trail</CardTitle>
            <CardDescription>Durable generation events recorded by the app.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generation.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events recorded yet.</p>
              ) : (
                generation.events.map((event) => (
                  <div
                    key={event.id}
                    className="grid gap-1 rounded-lg border p-3 sm:grid-cols-[170px_1fr]"
                  >
                    <div className="text-xs text-muted-foreground">
                      {formatDate(event.createdAt)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatGenerationLabel(event.stage)}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.message ?? "No message."}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
