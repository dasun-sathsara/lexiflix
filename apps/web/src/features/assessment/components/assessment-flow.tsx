"use client";

import { AlertCircle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  AnswerAssessmentResponse,
  AssessmentResult,
  PublicAssessmentItem,
  StartAssessmentResponse,
} from "@/features/assessment/lib/types";
import { cn } from "@/lib/utils";

type Selection = number | "idk" | null;

export function AssessmentFlow() {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [question, setQuestion] = useState<PublicAssessmentItem | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [minItems, setMinItems] = useState(8);
  const [maxItems, setMaxItems] = useState(12);
  const [selection, setSelection] = useState<Selection>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingStart, setIsLoadingStart] = useState(true);
  const [isSubmitting, startSubmitting] = useTransition();

  const questionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsLoadingStart(true);
      setError(null);

      try {
        const response = await fetch("/api/assessment/start", {
          method: "POST",
        });

        const payload = (await response.json()) as StartAssessmentResponse | { error?: string };

        if (!response.ok) {
          const message =
            typeof payload === "object" && payload && "error" in payload
              ? payload.error
              : undefined;
          throw new Error(message ?? "Unable to start the assessment.");
        }

        if (!("status" in payload) || payload.status !== "in_progress") {
          throw new Error("Unable to start the assessment.");
        }

        if (cancelled) {
          return;
        }

        setAttemptId(payload.attemptId);
        setQuestion(payload.question);
        setAnsweredCount(payload.answeredCount);
        setMinItems(payload.minItems);
        setMaxItems(payload.maxItems);
        setSelection(null);
        questionStartRef.current = Date.now();
      } catch (startError) {
        if (cancelled) {
          return;
        }

        const message =
          startError instanceof Error ? startError.message : "Unable to start the assessment.";
        setError(message);
      } finally {
        if (!cancelled) {
          setIsLoadingStart(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const progressValue = useMemo(() => {
    if (result) {
      return 100;
    }

    return Math.max(0, Math.min(100, (answeredCount / maxItems) * 100));
  }, [answeredCount, maxItems, result]);

  const submitAnswer = async () => {
    if (!attemptId || !question || selection === null || isSubmitting) {
      return;
    }

    const selectedIndex = selection === "idk" ? null : selection;
    const responseTimeMs = Date.now() - questionStartRef.current;

    startSubmitting(async () => {
      setError(null);

      try {
        const response = await fetch("/api/assessment/answer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attemptId,
            itemId: question.id,
            selectedIndex,
            responseTimeMs,
          }),
        });

        const payload = (await response.json()) as AnswerAssessmentResponse | { error?: string };

        if (!response.ok) {
          const message =
            typeof payload === "object" && payload && "error" in payload
              ? payload.error
              : undefined;
          throw new Error(message ?? "Unable to submit answer.");
        }

        if (!("status" in payload)) {
          throw new Error("Unable to submit answer.");
        }

        if (payload.status === "completed") {
          setResult(payload.result);
          setAnsweredCount(payload.result.answeredCount);
          setMinItems(payload.minItems);
          setMaxItems(payload.maxItems);
          setQuestion(null);
          setSelection(null);
          return;
        }

        setQuestion(payload.question);
        setAnsweredCount(payload.answeredCount);
        setMinItems(payload.minItems);
        setMaxItems(payload.maxItems);
        setSelection(null);
        questionStartRef.current = Date.now();
      } catch (submitError) {
        const message =
          submitError instanceof Error ? submitError.message : "Unable to submit answer.";
        setError(message);
      }
    });
  };

  if (isLoadingStart) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span>Preparing your adaptive assessment...</span>
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
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Theta estimate
                </p>
                <p className="mt-1 text-lg font-semibold">{result.thetaMean.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  95% credible interval
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {result.thetaLow.toFixed(2)} to {result.thetaHigh.toFixed(2)}
                </p>
              </div>
            </div>

            {result.borderlineLabel ? (
              <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
                Borderline result: {result.borderlineLabel}
              </div>
            ) : null}

            <div className="space-y-3">
              <p className="text-sm font-medium">Level probabilities</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.levelProbabilities).map(([level, probability]) => (
                  <Badge key={level} variant="secondary">
                    {level}: {Math.round(probability * 100)}%
                  </Badge>
                ))}
              </div>
            </div>

            <Button asChild className="w-full gap-2 sm:w-auto">
              <Link href="/dashboard">
                Continue to dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
          <p>Minimum items before early finish: {minItems}</p>
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
            Choose the best answer. If you are unsure, use the "I don&apos;t know" option.
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
            I don&apos;t know
          </button>

          {error ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
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
