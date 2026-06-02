"use client";

import { Library } from "lucide-react";
import Link from "next/link";
import { AppEmptyState } from "@/components/common/app-surface";
import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { Button } from "@/components/ui/button";

interface StudySessionEmptyProps {
  packId: string;
  packTitle?: string;
}

export function StudySessionEmpty({ packId }: StudySessionEmptyProps) {
  return (
    <SoftGradientBackground className="relative z-0 h-dvh w-full overflow-hidden">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 py-[calc(1.5rem+env(safe-area-inset-bottom))] text-center">
        <AppEmptyState
          icon={Library}
          title="Nothing to study right now"
          description="No cards are due or available for review in this pack."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link href={`/packs/${packId}`}>Back to pack</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </div>
          }
        />
      </div>
    </SoftGradientBackground>
  );
}
