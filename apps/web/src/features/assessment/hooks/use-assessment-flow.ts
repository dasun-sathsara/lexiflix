import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  answerAssessmentAction,
  startAssessmentAction,
} from "@/features/assessment/server/actions";
import type { AssessmentResult, PublicAssessmentItem } from "@/features/assessment/types";

type Selection = number | "idk" | null;

export function useAssessmentFlow() {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [question, setQuestion] = useState<PublicAssessmentItem | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [_minItems, setMinItems] = useState(8);
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
        const response = await startAssessmentAction();

        if (!response.ok) {
          throw new Error(response.error ?? "Unable to start the assessment.");
        }

        const payload = response.data;

        if (payload.status !== "in_progress") {
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
        const response = await answerAssessmentAction({
          attemptId,
          itemId: question.id,
          selectedIndex,
          responseTimeMs,
        });

        if (!response.ok) {
          throw new Error(response.error ?? "Unable to submit answer.");
        }

        const payload = response.data;

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

  return {
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
  };
}
