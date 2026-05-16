import { Play } from "lucide-react";
import Link from "next/link";

import { AppEmptyState } from "@/components/common/app-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { clampToInt } from "@/features/dashboard/lib/utils";
import type { DashboardFocusPack } from "@/features/dashboard/server/queries";

interface NeedsAttentionProps {
  focusPacks: DashboardFocusPack[];
  hasPacks: boolean;
}

export function NeedsAttention({ focusPacks, hasPacks }: NeedsAttentionProps) {
  return (
    <Card className="shadow-sm lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Needs Attention</CardTitle>
            <CardDescription>Packs with overdue reviews.</CardDescription>
          </div>
          <Badge variant="secondary">
            {focusPacks.length > 0 ? `${focusPacks.length} focus` : "Clear"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {focusPacks.length > 0 ? (
          focusPacks.map((pack) => (
            <Link
              key={pack.id}
              href={`/study/${pack.id}`}
              className="group relative block overflow-hidden rounded-xl border border-border/80 bg-card/60 p-3 transition-colors duration-200 ease-out hover:border-primary/30 hover:bg-card"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-rose-500/75 to-rose-500/30"
              />
              <div className="pl-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium">{pack.title}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rose-200/50 bg-rose-500/10 px-1.5 py-0.5 text-xs font-medium text-rose-600 dark:border-rose-500/30 dark:text-rose-400">
                    <span className="tabular-nums">{pack.due}</span>
                    <span className="opacity-75">due</span>
                  </span>
                </div>
                <Progress
                  value={clampToInt((pack.due / Math.max(1, pack.total)) * 100)}
                  className="mt-2 h-1.5"
                />
              </div>
            </Link>
          ))
        ) : (
          <AppEmptyState
            icon={Play}
            title="All Memory Shields Intact"
            description={
              hasPacks
                ? "Your active vocabulary is fully reinforced. Ready for more? Introduce new cinematic terms or explore the catalog to expand your vault."
                : "Your active vocabulary is fully reinforced. Generate a pack from our catalog to start building your training queue."
            }
            className="border-dashed shadow-none"
            action={
              <Button size="sm" variant="outline" asChild>
                <Link href={hasPacks ? "/decks" : "/browse"}>
                  {hasPacks ? "View Decks" : "Browse Content"}
                </Link>
              </Button>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
