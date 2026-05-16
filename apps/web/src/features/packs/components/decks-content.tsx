import {
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Flame,
  Layers,
  Play,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { AppPageHeader, AppSectionHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { AppEmptyState, AppStat } from "@/components/common/app-surface";
import { Button } from "@/components/ui/button";
import { DeckRow } from "@/features/packs/components/deck-row";
import type { DeckStats, DeckSummary } from "@/features/packs/types";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";

interface DecksContentProps {
  decks: DeckSummary[];
  stats: DeckStats;
}

export function DecksContent({ decks, stats }: DecksContentProps) {
  const hasDecks = decks.length > 0;
  const totalCards = stats.totalDue + stats.totalNew;
  const firstStudyDeck =
    decks.find((deck) => deck.studyPlan.dueCount > 0) ??
    decks.find((deck) => deck.studyPlan.newAvailableToday > 0);

  return (
    <>
      <AppTopbar title="Decks" />
      <AppPageShell>
        <section className="flex flex-col gap-4">
          <AppPageHeader
            heading="Decks"
            actions={
              <>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/browse">
                    <Layers className="size-4" />
                    Browse Content
                  </Link>
                </Button>
                {totalCards > 0 && (
                  <Button size="lg" className="gap-1.5" asChild>
                    <Link
                      href={`/study/${firstStudyDeck?.id ?? decks[0]?.id}?mode=${
                        firstStudyDeck?.studyPlan.dueCount ? "due" : "new"
                      }`}
                    >
                      <Play className="size-3.5 fill-current" />
                      Start Session
                      <ChevronRight className="size-3.5 opacity-60" />
                    </Link>
                  </Button>
                )}
              </>
            }
            stats={
              <>
                <AppStat icon={Calendar} label="Due Today" value={stats.totalDue} tone="danger" />
                <AppStat icon={Sparkles} label="New Today" value={stats.totalNew} tone="accent" />
                <AppStat
                  icon={BookOpen}
                  label="Scheduled"
                  value={stats.totalLearning}
                  tone="warm"
                />
                <AppStat
                  icon={Clock}
                  label="Est. Today"
                  value={`${stats.totalEstimatedMinutes}m`}
                  tone="success"
                />
                <AppStat icon={Flame} label="Decks" value={decks.length} tone="warm" />
              </>
            }
          />
        </section>

        {hasDecks ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <AppSectionHeader heading="Active Decks" className="gap-0" />
              <span className="text-xs text-muted-foreground">
                {decks.length} {decks.length === 1 ? "deck" : "decks"}
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {decks.map((deck) => (
                <DeckRow key={deck.id} deck={deck} />
              ))}
            </div>
          </div>
        ) : (
          <AppEmptyState
            icon={Layers}
            title="No decks yet"
            description="Browse movies and TV shows to generate vocabulary decks and start learning."
            action={
              <Button size="sm" asChild>
                <Link href="/browse">
                  Browse Content
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            }
          />
        )}
      </AppPageShell>
    </>
  );
}
