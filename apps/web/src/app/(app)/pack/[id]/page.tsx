import { notFound } from "next/navigation";

import { PackStagingClient } from "@/features/packs/components/pack-staging-client";
import { getPackStagingView } from "@/features/packs/server/queries";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireSession } from "@/lib/auth-guards";

export default async function PackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, requireSession()]);
  const pack = await getPackStagingView({ packId: id, userId: session.user.id });

  if (!pack) {
    notFound();
  }

  return (
    <>
      <AppTopbar title="Study Pack" />
      <PackStagingClient pack={pack} />
    </>
  );
}
