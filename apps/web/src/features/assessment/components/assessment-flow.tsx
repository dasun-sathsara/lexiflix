"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAssessmentFlow } from "@/features/assessment/hooks/use-assessment-flow";
import { cn } from "@/lib/ui/cn";

import { AssessmentResultView } from "./assessment-result";

export function AssessmentFlow() {
  const {
    question,
    answeredCount,
    maxItems,
    selection,
    setSelection,
    result,
    error,
    isLoadingStart,
    isSubmitting,
    progressValue,
    submitAnswer,
  } = useAssessmentFlow();

  if (isLoadingStart) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span>Preparing your vocabulary check-in...</span>
        </div>
      </div>
    );
  }

  if (error && !question && !result) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center p-6">
        <Card className="w-full max-w-lg border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              Assessment unavailable
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    return <AssessmentResultView result={result} />;
  }

  if (!question) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
      <div className="space-y-3">
        <Progress value={progressValue} className="h-2" />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>
            Question {answeredCount + 1} of up to {maxItems}
          </p>
          <p>We&apos;re adjusting questions to match your pace!</p>
        </div>
      </div>

      <Card className="border-2">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">{question.level}</Badge>
            <Badge variant="outline">{question.type === "cloze" ? "Fill in" : "Meaning"}</Badge>
          </div>
          <CardTitle className="text-2xl tracking-tight whitespace-pre-line">
            {question.text}
          </CardTitle>
          <CardDescription>
            Select the option that fits best. If you&apos;re not sure, select &quot;I&apos;m not
            sure yet&quot; to help us calibrate your level.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selection === index;

            return (
              <button
                key={`${question.id}-${option}`}
                type="button"
                onClick={() => setSelection(index)}
                className={cn(
                  "w-full rounded-xl border p-4 text-left text-sm transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted/40",
                )}
                disabled={isSubmitting}
              >
                <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSelection("idk")}
            className={cn(
              "w-full rounded-xl border border-dashed p-4 text-left text-sm transition-colors",
              selection === "idk"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/50 hover:bg-muted/40",
            )}
            disabled={isSubmitting}
          >
            I&apos;m not sure yet
          </button>

          {error ? (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            onClick={submitAnswer}
            disabled={selection === null || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Saving answer...
              </span>
            ) : (
              "Submit answer"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
