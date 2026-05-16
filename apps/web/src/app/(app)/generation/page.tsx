import { Activity, Clock, Sparkles, XCircle } from "lucide-react";
import Link from "next/link";

import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { AppEmptyState, AppStat } from "@/components/common/app-surface";
import { Button } from "@/components/ui/button";
import { GenerationJobsClient } from "@/features/pack-generation/components/generation-jobs-client";
import { computeGenerationStats } from "@/features/pack-generation/lib/deck-stats";
import { listPackGenerationProgressForDecks } from "@/features/pack-generation/server/queries";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireSession } from "@/lib/auth/guards";

export default async function GenerationStatusPage() {
  const session = await requireSession();
  const jobs = await listPackGenerationProgressForDecks({ userId: session.user.id });
  const stats = computeGenerationStats(jobs);

  return (
    <>
      <AppTopbar title="Generation Jobs" />
      <AppPageShell>
        <AppPageHeader
          heading="Generation Jobs"
          description="Track active and recent pack-generation jobs without mixing them into your study decks."
          stats={
            <>
              <AppStat icon={Activity} label="Active" value={stats.active} tone="accent" />
              <AppStat icon={Sparkles} label="Completed" value={stats.completed} tone="success" />
              <AppStat icon={XCircle} label="Failed" value={stats.failed} tone="danger" />
              <AppStat icon={Clock} label="Recent Jobs" value={stats.total} tone="warm" />
            </>
          }
        />

        {jobs.length > 0 ? (
          <GenerationJobsClient initialJobs={jobs} />
        ) : (
          <AppEmptyState
            icon={Sparkles}
            title="No generation jobs yet"
            description="Start from a movie or TV title to generate a vocabulary pack."
            action={
              <Button size="sm" asChild>
                <Link href="/browse">Browse Content</Link>
              </Button>
            }
          />
        )}
      </AppPageShell>
    </>
  );
}
