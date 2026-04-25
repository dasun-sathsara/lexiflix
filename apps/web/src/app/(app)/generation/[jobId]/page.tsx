import { notFound } from "next/navigation";
import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { GenerationProgressClient } from "@/features/pack-generation/components/generation-progress-client";
import { getPackGenerationProgressView } from "@/features/pack-generation/server/queries";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireSession } from "@/lib/auth-guards";

export default async function GenerationProgressPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const [{ jobId }, session] = await Promise.all([params, requireSession()]);
  const generation = await getPackGenerationProgressView({
    userId: session.user.id,
    jobId,
    includeEvents: true,
  });

  if (!generation) {
    notFound();
  }

  return (
    <>
      <AppTopbar title="Generation" />
      <AppPageShell>
        <AppPageHeader
          eyebrow="Pack generation"
          heading="Generation Progress"
          description="Durable progress for a user-owned pack generation job."
        />
        <GenerationProgressClient initialGeneration={generation} />
      </AppPageShell>
    </>
  );
}
