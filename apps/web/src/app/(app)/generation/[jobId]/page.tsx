import { notFound } from "next/navigation";
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
      <AppTopbar title={generation.content.title} />
      <AppPageShell>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{generation.content.title}</h1>
        </div>
        <GenerationProgressClient initialGeneration={generation} />
      </AppPageShell>
    </>
  );
}
