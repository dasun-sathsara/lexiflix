import type { Metadata } from "next";
import { getCefrProfile } from "@/features/assessment/server/queries";
import { CuratedContent } from "@/features/curation/components/curated-content";
import { partitionCuratedEntries, resolveActiveLevel } from "@/features/curation/lib/curated-feed";
import { listPublishedCuratedEntries } from "@/features/curation/server/queries";
import { getEffectiveCefrLevel } from "@/features/settings/components/utils";
import { requireSession } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Curated — LexiFlix",
  description: "Published curated movie and TV picks for signed-in learners",
};

export default async function CuratedPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const { level: levelParam } = await searchParams;
  const session = await requireSession();
  const profile = await getCefrProfile(session.user.id);
  const userLevel = profile
    ? getEffectiveCefrLevel(profile.manualOverrideLevel, profile.assessedLevel)
    : null;

  const activeLevel = resolveActiveLevel(levelParam, userLevel);
  const allEntries = await listPublishedCuratedEntries({ limit: 500 });
  const { featuredEntry, movieEntries, tvEntries } = partitionCuratedEntries(
    allEntries,
    activeLevel,
  );

  return (
    <CuratedContent
      activeLevel={activeLevel}
      userLevel={userLevel}
      featuredEntry={featuredEntry}
      movieEntries={movieEntries}
      tvEntries={tvEntries}
    />
  );
}
