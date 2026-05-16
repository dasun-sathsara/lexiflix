"use client";

import Link from "next/link";

import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { Button } from "@/components/ui/button";

interface StudySessionEmptyProps {
  packId: string;
}

export function StudySessionEmpty({ packId }: StudySessionEmptyProps) {
  return (
    <SoftGradientBackground className="relative z-0 h-dvh w-full overflow-hidden">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 py-[calc(1.5rem+env(safe-area-inset-bottom))] text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Nothing to study right now</h1>
        <p className="text-sm text-muted-foreground">No cards are available for this study mode.</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
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
