import { notFound } from "next/navigation";

import { StudySessionClient } from "@/features/packs/components/study-session-client";
import { getStudySessionView } from "@/features/packs/server/queries";
import type { StudyMode } from "@/features/packs/types";
import { requireSession } from "@/lib/auth-guards";

function toStudyMode(value: string | string[] | undefined): StudyMode {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "new" || raw === "preview" || raw === "cram" ? raw : "due";
}

export default async function StudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ card?: string | string[]; mode?: string | string[] }>;
}) {
  const [{ id }, query, session] = await Promise.all([params, searchParams, requireSession()]);
  const requestedCardId = Array.isArray(query.card) ? query.card[0] : query.card;
  const mode = requestedCardId ? "preview" : toStudyMode(query.mode);
  const view = await getStudySessionView({
    packId: id,
    userId: session.user.id,
    initialCardId: requestedCardId,
    mode,
  });

  if (!view) {
    notFound();
  }

  return <StudySessionClient session={view} />;
}
