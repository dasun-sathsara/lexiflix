import { getCefrProfile, shouldShowAssessmentBanner } from "@/features/assessment/server/queries";
import { DashboardContent } from "@/features/dashboard/components/dashboard-content";
import { buildDashboardViewModel } from "@/features/dashboard/lib/view-model";
import { getDashboardView } from "@/features/dashboard/server/queries";
import { reconcileDueReviewNotificationForUser } from "@/features/notifications/server/mutations";
import { getEffectiveCefrLevel } from "@/features/settings/lib/utils";
import { requireSession } from "@/lib/auth/guards";

export default async function DashboardPage() {
  const session = await requireSession();
  const [showAssessmentBanner, dashboard, profile] = await Promise.all([
    shouldShowAssessmentBanner(session.user.id),
    getDashboardView({ userId: session.user.id }),
    getCefrProfile(session.user.id),
    reconcileDueReviewNotificationForUser({ userId: session.user.id }),
  ]);

  const userLevel = profile
    ? getEffectiveCefrLevel(profile.manualOverrideLevel, profile.assessedLevel)
    : null;

  const vm = buildDashboardViewModel({
    session: { user: { name: session.user.name ?? null, email: session.user.email ?? null } },
    dashboard,
    userLevel,
    showAssessmentBanner,
  });

  return <DashboardContent vm={vm} />;
}
