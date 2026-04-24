import { notFound } from "next/navigation";

import { StudySessionClient } from "@/features/packs/components/study-session-client";
import { getStudySessionView } from "@/features/packs/server/queries";
import { requireSession } from "@/lib/auth-guards";

export default async function StudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ card?: string | string[] }>;
}) {
  const [{ id }, query, session] = await Promise.all([params, searchParams, requireSession()]);
  const requestedCardId = Array.isArray(query.card) ? query.card[0] : query.card;
  const view = await getStudySessionView({
    packId: id,
    userId: session.user.id,
    initialCardId: requestedCardId,
  });

  if (!view) {
    notFound();
  }

  return <StudySessionClient session={view} />;
}
