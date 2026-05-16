import type { ActionResult } from "@/lib/contracts/action-result";
import type { CefrLevel } from "@/lib/domain/cefr";

export { CEFR_LEVELS, type CefrLevel } from "@/lib/domain/cefr";

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

export type StartAssessmentActionResult = ActionResult<StartAssessmentResponse>;

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

export type AnswerAssessmentActionResult = ActionResult<AnswerAssessmentResponse>;
