import { ChevronLeft } from "lucide-react";
import Link from "next/link";
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
          <Link
            href="/generation"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground w-fit"
          >
            <ChevronLeft className="size-3" />
            Generation Jobs
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{generation.content.title}</h1>
          {generation.content.subtitle ? (
            <p className="text-sm text-muted-foreground">{generation.content.subtitle}</p>
          ) : null}
        </div>
        <GenerationProgressClient initialGeneration={generation} />
      </AppPageShell>
    </>
  );
}
