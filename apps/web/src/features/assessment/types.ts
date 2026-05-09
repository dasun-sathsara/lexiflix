export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];

export type AssessmentItemType = "cloze" | "meaning";

export type AssessmentItem = {
  id: string;
  text: string;
  type: AssessmentItemType;
  level: CefrLevel;
  options: [string, string, string, string];
  correctIndex: number;
  difficulty: number;
};

export type PublicAssessmentItem = Omit<AssessmentItem, "correctIndex">;

export type LevelProbabilities = Record<CefrLevel, number>;

export type PosteriorSummary = {
  thetaMean: number;
  thetaLow: number;
  thetaHigh: number;
  levelProbabilities: LevelProbabilities;
  bestLevel: CefrLevel;
  confidence: number;
  borderlineLabel: string | null;
};

export type AssessmentState = {
  posterior: number[];
  usedItemIds: string[];
  askedLevels: CefrLevel[];
  pendingItemId: string | null;
  answeredCount: number;
  totalResponseTimeMs: number;
  timedResponseCount: number;
};

export type AssessmentResult = PosteriorSummary & {
  answeredCount: number;
};

export type StartAssessmentResponse = {
  status: "in_progress";
  attemptId: string;
  question: PublicAssessmentItem;
  answeredCount: number;
  minItems: number;
  maxItems: number;
};

export type StartAssessmentActionResult =
  | {
      success: true;
      data: StartAssessmentResponse;
    }
  | {
      success: false;
      error: string;
    };

export type AnswerAssessmentResponse =
  | {
      status: "in_progress";
      attemptId: string;
      question: PublicAssessmentItem;
      answeredCount: number;
      minItems: number;
      maxItems: number;
      summary: PosteriorSummary;
    }
  | {
      status: "completed";
      attemptId: string;
      result: AssessmentResult;
      minItems: number;
      maxItems: number;
    };

export type AnswerAssessmentActionResult =
  | {
      success: true;
      data: AnswerAssessmentResponse;
    }
  | {
      success: false;
      error: string;
    };
