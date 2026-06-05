import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AssessmentResult } from "@/features/assessment/types";

const CEFR_DESCRIPTIONS: Record<string, string> = {
  A1: "Beginner — everyday basics",
  A2: "Elementary — familiar topics",
  B1: "Intermediate — independent user",
  B2: "Upper-intermediate — confident user",
  C1: "Advanced — fluent and flexible",
  C2: "Mastery — near-native command",
};

const CEFR_VOCABULARY_ESTIMATE: Record<string, string> = {
  A1: "500",
  A2: "1,000",
  B1: "2,000",
  B2: "4,000",
  C1: "8,000",
  C2: "16,000",
};

type AssessmentResultViewProps = {
  result: AssessmentResult;
};

export function AssessmentResultView({ result }: AssessmentResultViewProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
      <Progress value={100} className="h-2" />
      <Card className="border-2">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <Sparkles className="size-3.5" />
            Assessment complete
          </div>
          <CardTitle className="text-3xl tracking-tight">
            Your CEFR level: {result.bestLevel}
          </CardTitle>
          <CardDescription>
            Confidence {Math.round(result.confidence * 100)}% after {result.answeredCount} items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                What this means
              </p>
              <p className="mt-1 text-lg font-semibold">{CEFR_DESCRIPTIONS[result.bestLevel]}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Estimated vocabulary
              </p>
              <p className="mt-1 text-lg font-semibold">
                ~{CEFR_VOCABULARY_ESTIMATE[result.bestLevel]} word families
              </p>
            </div>
          </div>

          {result.borderlineLabel ? (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
              <div className="font-semibold">Bridging Level: {result.bestLevel}</div>
              <div className="mt-1 text-xs opacity-90">
                You&apos;re on the cusp of {result.bestLevel}! We&apos;ll suggest key words to
                bridge the gap.
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="text-sm font-medium">Your Skill Profile</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.levelProbabilities).map(([level, probability]) => (
                <Badge key={level} variant="secondary">
                  {level}: {Math.round(probability * 100)}%
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild className="w-full gap-2 sm:w-auto">
              <Link href="/dashboard">
                Continue to dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full gap-2 sm:w-auto border-primary/20 hover:border-primary/40 hover:bg-primary/5"
            >
              <Link href="/curated">
                Explore Curated Picks
                <Sparkles className="size-4 text-primary fill-current opacity-85" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
