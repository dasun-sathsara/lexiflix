import { BookOpen, Sparkles, TrendingUp } from "lucide-react";

import { AppStat } from "@/components/common/app-surface";
import type { DashboardView } from "@/features/dashboard/types";

interface DashboardStatsProps {
  stats: DashboardView["stats"];
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <AppStat
        variant="card"
        label="Terms Known"
        value={`${stats.totalTermsKnown}`}
        icon={BookOpen}
        hint="Across all packs"
        tone="accent"
      />
      <AppStat
        variant="card"
        label="Reviews This Week"
        value={`${stats.reviewsCompletedThisWeek}`}
        icon={TrendingUp}
        hint="From review history"
        tone="success"
      />
      <AppStat
        variant="card"
        label="New Done Today"
        value={`${stats.newCardsCompletedToday} / ${stats.newCardsPerDay}`}
        icon={Sparkles}
        hint="Daily new-card goal"
        tone="warm"
      />
    </div>
  );
}
