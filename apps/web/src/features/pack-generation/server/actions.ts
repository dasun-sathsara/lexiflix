"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth-guards";
import type { PackGenerationProgressActionResult } from "../types";
import { getPackGenerationProgressView, listPackGenerationProgressForDecks } from "./queries";

const jobInputSchema = z.object({
  jobId: z.string().min(1),
  includeEvents: z.boolean().optional(),
});

export async function getPackGenerationProgressAction(
  input: z.input<typeof jobInputSchema>,
): Promise<PackGenerationProgressActionResult> {
  const session = await requireSession();
  const parsed = jobInputSchema.parse(input);
  const generation = await getPackGenerationProgressView({
    userId: session.user.id,
    jobId: parsed.jobId,
    includeEvents: parsed.includeEvents ?? false,
  });

  if (!generation) {
    return { success: false, message: "Generation job was not found." };
  }

  return { success: true, generation };
}

export async function listGenerationJobsAction() {
  const session = await requireSession();
  return {
    success: true as const,
    jobs: await listPackGenerationProgressForDecks({ userId: session.user.id }),
  };
}
