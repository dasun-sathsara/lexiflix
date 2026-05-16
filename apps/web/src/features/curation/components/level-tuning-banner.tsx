import { ChevronRight, GraduationCap } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function LevelTuningBanner() {
  return (
    <Card className="border-amber-200/70 bg-amber-500/5 py-0 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-200/70 bg-amber-500/10 text-amber-600 dark:border-amber-500/30 dark:text-amber-300">
            <GraduationCap className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold tracking-tight">Personalize Your Feed</h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
              We're currently showing basic{" "}
              <span className="font-semibold text-foreground">A1</span> recommendations. Take our
              language assessment or select your level manually in settings to personalize your
              curated feed!
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button asChild size="sm" variant="outline" className="h-8 rounded-full text-xs">
            <Link href="/settings?tab=account">Configure Level</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="h-8 rounded-full text-xs bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600"
          >
            <Link href="/onboarding/assessment">
              Take Assessment
              <ChevronRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
