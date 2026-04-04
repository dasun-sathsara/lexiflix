import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  applyAnswerToState,
  getItemById,
  parseAssessmentState,
  toPublicItem,
} from "@/features/assessment/lib/engine";
import type { AnswerAssessmentResponse, AssessmentState } from "@/features/assessment/lib/types";
import { auth } from "@/lib/auth";
import { db } from "@/lib/server/db";
import { cefrAssessmentAttempt, cefrAssessmentResponse, cefrProfile } from "@/lib/server/db/schema";

const answerSchema = z.object({
  attemptId: z.uuid(),
  itemId: z.string().min(1),
  selectedIndex: z.number().int().min(0).max(3).nullable(),
  responseTimeMs: z.number().int().min(0).max(300_000).nullable().optional(),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = answerSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
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
    return NextResponse.json({ error: "Assessment attempt not found." }, { status: 404 });
  }

  if (attempt.status !== "in_progress") {
    return NextResponse.json(
      { error: "Assessment attempt is already completed." },
      { status: 409 },
    );
  }

  let state: AssessmentState;
  try {
    state = parseAssessmentState(attempt.state);
  } catch {
    return NextResponse.json({ error: "Assessment state is invalid." }, { status: 500 });
  }

  if (!state.pendingItemId) {
    return NextResponse.json({ error: "No pending question for this attempt." }, { status: 409 });
  }

  if (state.pendingItemId !== itemId) {
    return NextResponse.json(
      { error: "Answered item does not match current question." },
      { status: 409 },
    );
  }

  const item = getItemById(itemId);
  if (!item) {
    return NextResponse.json({ error: "Assessment item not found." }, { status: 400 });
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
        completedAt: new Date(),
      })
      .where(eq(cefrAssessmentAttempt.id, attemptId));

    await db
      .insert(cefrProfile)
      .values({
        userId: session.user.id,
        assessedLevel: result.bestLevel,
        assessedConfidence: result.confidence,
        assessedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: cefrProfile.userId,
        set: {
          assessedLevel: result.bestLevel,
          assessedConfidence: result.confidence,
          assessedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    const payload: AnswerAssessmentResponse = {
      status: "completed",
      attemptId,
      result,
      minItems: next.minItems,
      maxItems: next.maxItems,
    };

    return NextResponse.json(payload);
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

  const payload: AnswerAssessmentResponse = {
    status: "in_progress",
    attemptId,
    question: toPublicItem(next.nextItem),
    answeredCount: next.state.answeredCount,
    minItems: next.minItems,
    maxItems: next.maxItems,
    summary: next.summary,
  };

  return NextResponse.json(payload);
}
