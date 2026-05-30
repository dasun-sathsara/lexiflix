import { eq } from "drizzle-orm";

import { db } from "@/lib/server/db";
import { cefrProfile } from "@/lib/server/db/schema";

export async function getCefrProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(cefrProfile)
    .where(eq(cefrProfile.userId, userId))
    .limit(1);

  return profile ?? null;
}

export async function shouldShowAssessmentBanner(userId: string) {
  const profile = await getCefrProfile(userId);
  if (!profile) {
    return true;
  }

  return !profile.assessedLevel;
}
