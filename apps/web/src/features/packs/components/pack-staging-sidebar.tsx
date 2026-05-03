import { BookOpen, Layers, Play, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { PackStagingView } from "@/features/packs/types";

export type PackStagingSidebarProps = {
  pack: PackStagingView;
  stats: { total: number };
  progressPct: number;
  pendingAction: boolean;
  onResetPack: () => void;
};

/**
 * Renders the sidebar for the pack staging view, showing study readiness and statistics.
 */
export function PackStagingSidebar({
  pack,
  stats,
  progressPct,
  pendingAction,
  onResetPack,
}: PackStagingSidebarProps) {
  return (
    <aside className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ready to Learn?</CardTitle>
          <CardDescription>
            {pack.studyPlan.dueCount > 0
              ? `You have ${pack.studyPlan.dueCount} due cards.`
              : pack.studyPlan.newAvailableToday > 0
                ? `${pack.studyPlan.newAvailableToday} new cards are available today.`
                : "There are no scheduled cards ready right now."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pack.studyPlan.dueCount > 0 ? (
            <Button className="w-full gap-2" size="lg" asChild>
              <Link href={`/study/${pack.id}?mode=due`}>
                <Play className="size-4" />
                Review Due
              </Link>
            </Button>
          ) : pack.studyPlan.newAvailableToday > 0 ? (
            <Button className="w-full gap-2" size="lg" asChild>
              <Link href={`/study/${pack.id}?mode=new`}>
                <Sparkles className="size-4" />
                Learn New
              </Link>
            </Button>
          ) : (
            <Button className="w-full gap-2" size="lg" disabled>
              <Play className="size-4" />
              Complete For Now
            </Button>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-1.5" size="sm" asChild>
              <Link href="/decks">
                <Layers className="size-3.5" />
                Decks
              </Link>
            </Button>
            {pack.media.mediaInfoHref ? (
              <Button variant="outline" className="flex-1 gap-1.5" size="sm" asChild>
                <Link href={pack.media.mediaInfoHref}>
                  <BookOpen className="size-3.5" />
                  Media Info
                </Link>
              </Button>
            ) : (
              <Button variant="outline" className="flex-1 gap-1.5" size="sm" disabled>
                <BookOpen className="size-3.5" />
                Media Info
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pack Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total cards</span>
            <span className="font-normal">{stats.total}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Due now</span>
            <span className="font-normal">{pack.studyPlan.dueCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">New today</span>
            <span className="font-normal">{pack.studyPlan.newAvailableToday}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Future learning</span>
            <span className="font-normal">{pack.studyPlan.futureLearningCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Hidden/removed</span>
            <span className="font-normal">{pack.studyPlan.hiddenCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Est. study time</span>
            <span className="font-normal">
              ~{pack.estimatedStudyMinutes ?? Math.max(1, Math.ceil(stats.total * 1.5))} min
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Mastery rate</span>
            <span className="font-medium">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                disabled={pendingAction}
              >
                <RotateCcw className="size-3.5" />
                Reset Pack Progress
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset this pack?</AlertDialogTitle>
                <AlertDialogDescription>
                  This restores removed cards and resets all cards to new. Review history is not
                  deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onResetPack}
                  className="border-transparent bg-destructive/10 text-destructive shadow-none hover:bg-destructive/15"
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </aside>
  );
}
