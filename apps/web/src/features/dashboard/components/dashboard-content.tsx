import { AppPageShell } from "@/components/common/app-page-shell";
import { AssessmentBanner } from "@/features/dashboard/components/assessment-banner";
import { CuratedPicksBanner } from "@/features/dashboard/components/curated-picks-banner";
import { DashboardHero } from "@/features/dashboard/components/dashboard-hero";
import { DashboardStats } from "@/features/dashboard/components/dashboard-stats";
import { JumpBackIn } from "@/features/dashboard/components/jump-back-in";
import { NeedsAttention } from "@/features/dashboard/components/needs-attention";
import type { DashboardViewModel } from "@/features/dashboard/lib/view-model";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";

interface DashboardContentProps {
  vm: DashboardViewModel;
}

export function DashboardContent({ vm }: DashboardContentProps) {
  return (
    <>
      <AppTopbar title="Dashboard" />
      <AppPageShell className="gap-5">
        <DashboardHero
          streakDays={vm.streakDays}
          hasWorkNow={vm.hasWorkNow}
          readyNow={vm.readyNow}
          displayName={vm.displayName}
          heroDescription={vm.heroDescription}
          nextStudyHref={vm.nextStudyHref}
          nextStudyLabel={vm.nextStudyLabel}
          todayLoadPct={vm.todayLoadPct}
          planItems={vm.planItems}
        />

        {vm.showAssessmentBanner ? <AssessmentBanner /> : null}

        <CuratedPicksBanner userLevel={vm.userLevel} />

        <DashboardStats stats={vm.dashboard.stats} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <JumpBackIn packs={vm.dashboard.recentPacks} />
          <NeedsAttention focusPacks={vm.dashboard.reviewPlan.focusPacks} hasPacks={vm.hasPacks} />
        </div>
      </AppPageShell>
    </>
  );
}
