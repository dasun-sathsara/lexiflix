import type { DeckStats, DeckSummary } from "@/features/packs/types";

export function computeDeckStats(decks: DeckSummary[]): DeckStats {
  return decks.reduce(
    (totals, deck) => {
      totals.totalDue += deck.studyPlan.dueCount;
      totals.totalNew += deck.studyPlan.newAvailableToday;
      totals.totalLearning += deck.studyPlan.futureLearningCount;
      totals.totalEstimatedMinutes +=
        deck.estimatedStudyMinutes ?? Math.max(1, Math.ceil(deck.counts.total * 1.5));
      return totals;
    },
    { totalDue: 0, totalNew: 0, totalLearning: 0, totalEstimatedMinutes: 0 },
  );
}
