"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  ASSESSMENT_LIMITS,
  applyAnswerToState,
  getItemById,
  initializeAssessmentState,
  parseAssessmentState,
  toPublicItem,
} from "@/features/assessment/lib/engine";
import type {
  AnswerAssessmentActionResult,
  AnswerAssessmentResponse,
  AssessmentState,
  StartAssessmentActionResult,
  StartAssessmentResponse,
} from "@/features/assessment/lib/types";
import { getSessionOrNull } from "@/lib/auth-guards";
import { db } from "@/lib/server/db";
import { cefrAssessmentAttempt, cefrAssessmentResponse, cefrProfile } from "@/lib/server/db/schema";

const answerSchema = z.object({
  attemptId: z.uuid(),
  itemId: z.string().min(1),
  selectedIndex: z.number().int().min(0).max(3).nullable(),
  responseTimeMs: z.number().int().min(0).max(300_000).nullable().optional(),
});

export async function startAssessmentAction(): Promise<StartAssessmentActionResult> {
  const session = await getSessionOrNull();

  if (!session?.user) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  const { state, firstItem } = initializeAssessmentState();
  const attemptId = crypto.randomUUID();

  await db.insert(cefrAssessmentAttempt).values({
    id: attemptId,
    userId: session.user.id,
    status: "in_progress",
    state,
    answeredCount: 0,
  });

  const data: StartAssessmentResponse = {
    status: "in_progress",
    attemptId,
    question: toPublicItem(firstItem),
    answeredCount: 0,
    minItems: ASSESSMENT_LIMITS.minItems,
    maxItems: ASSESSMENT_LIMITS.maxItems,
  };

  return {
    success: true,
    data,
  };
}

export async function answerAssessmentAction(input: {
  attemptId: string;
  itemId: string;
  selectedIndex: number | null;
  responseTimeMs?: number | null;
}): Promise<AnswerAssessmentActionResult> {
  const session = await getSessionOrNull();

  if (!session?.user) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  const parsed = answerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid request payload.",
    };
  }

  const { attemptId, itemId, selectedIndex, responseTimeMs } = parsed.data;

  const [attempt] = await db
    .select()
    .from(cefrAssessmentAttempt)
    .where(
      and(
        eq(cefrAssessmentAttempt.id, attemptId),
        eq(cefrAssessmentAttempt.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!attempt) {
    return {
      success: false,
      error: "Assessment attempt not found.",
    };
  }

  if (attempt.status !== "in_progress") {
    return {
      success: false,
      error: "Assessment attempt is already completed.",
    };
  }

  let state: AssessmentState;
  try {
    state = parseAssessmentState(attempt.state);
  } catch {
    return {
      success: false,
      error: "Assessment state is invalid.",
    };
  }

  if (!state.pendingItemId) {
    return {
      success: false,
      error: "No pending question for this attempt.",
    };
  }

  if (state.pendingItemId !== itemId) {
    return {
      success: false,
      error: "Answered item does not match current question.",
    };
  }

  const item = getItemById(itemId);
  if (!item) {
    return {
      success: false,
      error: "Assessment item not found.",
    };
  }

  const isDontKnow = selectedIndex === null;
  const isCorrect = selectedIndex === item.correctIndex;
  const sequence = state.answeredCount + 1;

  const next = applyAnswerToState({
    state,
    item,
    isCorrect,
    responseTimeMs: responseTimeMs ?? null,
  });

  await db.insert(cefrAssessmentResponse).values({
    id: crypto.randomUUID(),
    attemptId,
    itemId: item.id,
    itemLevel: item.level,
    itemDifficulty: item.difficulty,
    sequence,
    selectedIndex,
    isDontKnow,
    isCorrect,
    responseTimeMs: responseTimeMs ?? null,
  });

  if (next.status === "completed") {
    const { result } = next;
    const now = new Date();

    await db
      .update(cefrAssessmentAttempt)
      .set({
        status: "completed",
        state: next.state,
        answeredCount: next.state.answeredCount,
        thetaMean: result.thetaMean,
        thetaLow: result.thetaLow,
        thetaHigh: result.thetaHigh,
        level: result.bestLevel,
        confidence: result.confidence,
        borderlineLabel: result.borderlineLabel,
        levelProbabilities: result.levelProbabilities,
        completedAt: now,
      })
      .where(eq(cefrAssessmentAttempt.id, attemptId));

    await db
      .insert(cefrProfile)
      .values({
        userId: session.user.id,
        assessedLevel: result.bestLevel,
        assessedConfidence: result.confidence,
        assessedAt: now,
      })
      .onConflictDoUpdate({
        target: cefrProfile.userId,
        set: {
          assessedLevel: result.bestLevel,
          assessedConfidence: result.confidence,
          assessedAt: now,
          updatedAt: now,
        },
      });

    const data: AnswerAssessmentResponse = {
      status: "completed",
      attemptId,
      result,
      minItems: next.minItems,
      maxItems: next.maxItems,
    };

    return {
      success: true,
      data,
    };
  }

  await db
    .update(cefrAssessmentAttempt)
    .set({
      state: next.state,
      answeredCount: next.state.answeredCount,
      thetaMean: next.summary.thetaMean,
      thetaLow: next.summary.thetaLow,
      thetaHigh: next.summary.thetaHigh,
      level: next.summary.bestLevel,
      confidence: next.summary.confidence,
      borderlineLabel: next.summary.borderlineLabel,
      levelProbabilities: next.summary.levelProbabilities,
    })
    .where(eq(cefrAssessmentAttempt.id, attemptId));

  const data: AnswerAssessmentResponse = {
    status: "in_progress",
    attemptId,
    question: toPublicItem(next.nextItem),
    answeredCount: next.state.answeredCount,
    minItems: next.minItems,
    maxItems: next.maxItems,
    summary: next.summary,
  };

  return {
    success: true,
    data,
  };
}
