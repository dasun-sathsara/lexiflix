"use client";

import { ArrowRight, Clock, Library, RotateCcw } from "lucide-react";
import Link from "next/link";

import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudySessionView } from "@/features/packs/types";

import { formatDueLabel, formatElapsed } from "../lib/utils";

interface StudySessionCompleteProps {
  reviewedCount: number;
  newLearnedCount: number;
  lapseCount: number;
  nextDueAt: string | null;
  elapsedTimeMs: number;
  mode: StudySessionView["mode"];
  newCardsRemainingToday: number;
  packId: string;
}

export function StudySessionComplete({
  reviewedCount,
  newLearnedCount,
  lapseCount,
  nextDueAt,
  elapsedTimeMs,
  mode,
  newCardsRemainingToday,
  packId,
}: StudySessionCompleteProps) {
  return (
    <SoftGradientBackground className="relative z-0 h-dvh w-full overflow-hidden">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-6 py-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="w-full text-center space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <Badge
              variant="secondary"
              className="border-primary/15 bg-primary/8 text-primary font-medium tracking-wide"
            >
              Memory Vault Updated
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Session Complete
            </h1>
          </div>

          {/* Minimalist Stats Row */}
          <div className="grid grid-cols-4 divide-x divide-border border-y border-border/80 py-6 text-center">
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {reviewedCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5 font-semibold tracking-wider uppercase text-[10px]">
                Reinforced
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {newLearnedCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5 font-semibold tracking-wider uppercase text-[10px]">
                Acquired
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {lapseCount}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5 font-semibold tracking-wider uppercase text-[10px]">
                Flagged
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {formatElapsed(elapsedTimeMs)}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5 font-semibold tracking-wider uppercase text-[10px]">
                Time
              </div>
            </div>
          </div>

          {/* Next Due Schedule Banner */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4 shrink-0 text-muted-foreground/60" />
            <span className="font-medium">{formatDueLabel(nextDueAt)}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            {mode === "due" && newLearnedCount < newCardsRemainingToday ? (
              <Button asChild className="h-10 px-5 shadow-sm">
                <Link
                  href={`/study/${packId}?mode=new`}
                  className="flex items-center justify-center gap-1.5"
                >
                  Continue with new cards
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="h-10 px-5">
              <Link href={`/pack/${packId}`} className="flex items-center justify-center gap-1.5">
                <RotateCcw className="size-3.5" />
                Back to pack
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-10 px-5">
              <Link href="/decks" className="flex items-center justify-center gap-1.5">
                <Library className="size-3.5" />
                Decks
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </SoftGradientBackground>
  );
}
