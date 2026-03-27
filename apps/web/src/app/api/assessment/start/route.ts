import { NextResponse } from "next/server";

import {
  ASSESSMENT_LIMITS,
  initializeAssessmentState,
  toPublicItem,
} from "@/features/assessment/lib/engine";
import type { StartAssessmentResponse } from "@/features/assessment/lib/types";
import { auth } from "@/lib/auth";
import { db } from "@/lib/server/db";
import { cefrAssessmentAttempt } from "@/lib/server/db/schema";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { state, firstItem } = initializeAssessmentState();
  const attemptId = crypto.randomUUID();

  await db.insert(cefrAssessmentAttempt).values({
    id: attemptId,
    userId: session.user.id,
    status: "in_progress",
    state: state as unknown as Record<string, unknown>,
    answeredCount: 0,
  });

  const payload: StartAssessmentResponse = {
    status: "in_progress",
    attemptId,
    question: toPublicItem(firstItem),
    answeredCount: 0,
    minItems: ASSESSMENT_LIMITS.minItems,
    maxItems: ASSESSMENT_LIMITS.maxItems,
  };

  return NextResponse.json(payload);
}
