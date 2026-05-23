export type PackCardState = "new" | "learning" | "due" | "mastered" | "removed";
export type PackContentKind = "movie" | "season";
export type PackVocabularyKind = "word" | "phrasal_verb" | "idiom" | "slang";
export type PackCefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type PackReviewRating = "again" | "hard" | "good" | "easy";

export type PackCardCounts = {
  new: number;
  learning: number;
  due: number;
  mastered: number;
  futureLearning: number;
  hidden: number;
  total: number;
};

export type StudyMode = "due" | "new" | "preview" | "cram";

export type PackStudyPlan = {
  packId: string;
  dueCount: number;
  newAvailableToday: number;
  newTotal: number;
  futureLearningCount: number;
  masteredCount: number;
  hiddenCount: number;
  nextLearningDueAt: string | null;
  recommendedMode: Exclude<StudyMode, "preview" | "cram"> | null;
};

export type UserStudyPlan = {
  newCardsPerDay: number;
  newCardsCompletedToday: number;
  newCardsRemainingToday: number;
  dueNow: number;
  dueLaterToday: number;
  dueTomorrow: number;
  newAvailableToday: number;
  nextLearningDueAt: string | null;
  isCompleteForToday: boolean;
  packs: PackStudyPlan[];
};

export type PackMediaSummary = {
  id: string;
  kind: PackContentKind;
  title: string;
  subtitle: string | null;
  tmdbMovieId: number | null;
  tmdbShowId: number | null;
  tmdbSeasonNumber: number | null;
  releaseYear: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  mediaInfoHref: string | null;
};

export type PackCardView = {
  id: string;
  termId: string;
  termState: "unseen" | "learning" | "known" | null;
  displayText: string;
  kind: PackVocabularyKind;
  partOfSpeech: string | null;
  cefrLevel: PackCefrLevel | null;
  meaning: string | null;
  exampleSentences: string[];
  occurrenceCount: number;
  frequencyRank: number | null;
  includedReason: string | null;
  state: PackCardState;
  dueAt: string | null;
  lastReviewedAt: string | null;
  lastRating: PackReviewRating | null;
  repetitionCount: number;
  lapseCount: number;
  intervalDays: number | null;
  easeFactor: number;
  masteredAt: string | null;
  ratingPreviews: Record<PackReviewRating, string>;
  audioUrl: string | null;
  imageUrl: string | null;
};

export type PackStagingView = {
  id: string;
  name: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  media: PackMediaSummary;
  learnerCefrLevelAtGeneration: PackCefrLevel | null;
  selectedVocabularyTypes: PackVocabularyKind[];
  estimatedStudyMinutes: number | null;
  sourceJobId: string | null;
  counts: PackCardCounts;
  studyPlan: PackStudyPlan;
  cards: PackCardView[];
};

export type DeckSummary = {
  id: string;
  title: string;
  subtitle: string | null;
  mediaType: "movie" | "tv";
  posterUrl: string | null;
  counts: PackCardCounts;
  studyPlan: PackStudyPlan;
  estimatedStudyMinutes: number | null;
  lastStudiedAt: string | null;
};

export type StudySessionView = {
  packId: string;
  packName: string;
  mediaTitle: string;
  mode: StudyMode;
  newCardsRemainingToday: number;
  nextNewHref: string | null;
  initialCardId: string | null;
  cards: PackCardView[];
};

export type PackActionResult = { ok: true; activeCount: number } | { ok: false; error: string };

export type PackItemActionResult =
  | { ok: true; activeCount: number; itemId: string }
  | { ok: false; error: string };

export type PackRatingActionResult =
  | {
      ok: true;
      itemId: string;
      nextState: Exclude<PackCardState, "due" | "removed">;
      dueAt: string;
      nextDueAt: string | null;
      reviewedCards: number;
    }
  | { ok: false; error: string };
