import { reconcileDueReviewNotificationForUser } from "@/features/notifications/server/queries";
import { DecksContent } from "@/features/packs/components/decks-content";
import { computeDeckStats } from "@/features/packs/lib/deck-stats";
import { getDeckSummariesForUser } from "@/features/packs/server/queries";
import { requireSession } from "@/lib/auth-guards";

export default async function DecksPage() {
  const session = await requireSession();
  const [decks] = await Promise.all([
    getDeckSummariesForUser({ userId: session.user.id }),
    reconcileDueReviewNotificationForUser({ userId: session.user.id }),
  ]);
  const stats = computeDeckStats(decks);

  return <DecksContent decks={decks} stats={stats} />;
}
