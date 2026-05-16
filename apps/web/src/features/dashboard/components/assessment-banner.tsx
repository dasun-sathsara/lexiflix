import { ChevronRight, GraduationCap } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AssessmentBanner() {
  return (
    <Card className="border-amber-200/70 py-0 shadow-sm dark:border-amber-500/30">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-amber-200/70 bg-amber-500/10 text-amber-600 dark:border-amber-500/30 dark:text-amber-300">
            <GraduationCap className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Benchmark Your Fluency</h3>
            <p className="text-sm text-muted-foreground">
              Establish your CEFR baseline to generate perfectly calibrated cinematic vocabulary
              packs.
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/onboarding/assessment">
            Calibrate Level
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
