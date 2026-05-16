import { ChevronRight, Layers } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AppEmptyState } from "@/components/common/app-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { clampToInt } from "@/features/dashboard/lib/utils";
import type { DashboardPackSummary } from "@/features/dashboard/types";
import { cn } from "@/lib/ui/cn";

interface JumpBackInProps {
  packs: DashboardPackSummary[];
}

export function JumpBackIn({ packs }: JumpBackInProps) {
  const hasPacks = packs.length > 0;

  return (
    <Card className="shadow-sm lg:col-span-3">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Jump Back In</CardTitle>
            <CardDescription>Recent packs and mastery progress.</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/decks">
              View Decks
              <ChevronRight className="size-4 opacity-70" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {hasPacks ? (
          packs.map((pack) => {
            const progressPct = clampToInt(
              (pack.masteredCount / Math.max(1, pack.totalCount)) * 100,
            );
            const href = pack.dueCount > 0 ? `/study/${pack.id}` : `/pack/${pack.id}`;
            const action =
              pack.dueCount > 0 ? "Review" : pack.newAvailableToday > 0 ? "Learn New" : "Open";
            const statusText =
              pack.dueCount > 0
                ? `${pack.dueCount} due${
                    pack.newAvailableToday > 0 ? `, ${pack.newAvailableToday} new today` : ""
                  }`
                : pack.newAvailableToday > 0
                  ? `${pack.newAvailableToday} new today`
                  : "No due reviews";
            const hasAction = pack.dueCount > 0 || pack.newAvailableToday > 0;

            return (
              <Link
                key={pack.id}
                href={href}
                className="group relative block overflow-hidden rounded-xl border border-border/80 bg-card/60 p-3 transition-[border-color,background-color] duration-200 ease-out hover:border-primary/30 hover:bg-card"
              >
                {hasAction ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b",
                      pack.dueCount > 0
                        ? "from-rose-500/75 to-rose-500/30"
                        : "from-primary/75 to-primary/30",
                    )}
                  />
                ) : null}
                <div className="flex gap-3 pl-2">
                  <div className="relative h-[88px] w-[60px] shrink-0 overflow-hidden rounded-lg border bg-muted shadow-xs">
                    {pack.posterUrl ? (
                      <Image
                        src={pack.posterUrl}
                        alt={pack.title}
                        fill
                        sizes="60px"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground">
                        <Layers className="size-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-[15px] font-semibold tracking-tight">
                          {pack.title}
                        </p>
                        <div className="flex min-w-0 items-center gap-2">
                          <Badge variant="secondary">{pack.kind}</Badge>
                          <span className="truncate text-xs text-muted-foreground">
                            {statusText}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0" asChild>
                        <span>{action}</span>
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Mastered</span>
                        <span className="font-medium tabular-nums text-foreground">
                          {pack.masteredCount}/{pack.totalCount}
                        </span>
                      </div>
                      <Progress value={progressPct} className="h-1.5" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <AppEmptyState
            icon={Layers}
            title="Your Study Library is Empty"
            description="Your personalized deck collection will appear here. Choose a film or series from our collection to generate your first vocabulary training pack."
            className="border-dashed shadow-none"
            action={
              <Button size="sm" asChild>
                <Link href="/browse">Browse Content</Link>
              </Button>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
