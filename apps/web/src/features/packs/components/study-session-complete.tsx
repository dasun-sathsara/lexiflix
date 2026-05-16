"use client";

import Link from "next/link";

import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudySessionView } from "@/features/packs/types";

import { formatDueLabel, formatElapsed } from "./utils";

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
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-5 px-6 py-[calc(1.5rem+env(safe-area-inset-bottom))] text-center">
        <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
          Session complete
        </Badge>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Memory Vault Updated</h1>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-4">
            <span>{reviewedCount} reinforced</span>
            <span>{newLearnedCount} newly acquired</span>
            <span>{lapseCount} flagged for reinforcement</span>
            <span>{formatDueLabel(nextDueAt)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Time spent: {formatElapsed(elapsedTimeMs)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {mode === "due" && newLearnedCount < newCardsRemainingToday ? (
            <Button asChild>
              <Link href={`/study/${packId}?mode=new`}>Continue with new cards</Link>
            </Button>
          ) : null}
          <Button asChild>
            <Link href={`/pack/${packId}`}>Back to pack</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/decks">Decks</Link>
          </Button>
        </div>
      </div>
    </SoftGradientBackground>
  );
}
