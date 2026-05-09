import { describe, expect, it } from "vitest";
import {
  createPriorPosterior,
  summarizePosterior,
  parseAssessmentState,
  toPublicItem,
} from "./utils";
import type { AssessmentItem, AssessmentState } from "./types";

describe("createPriorPosterior", () => {
  it("returns an array of probabilities", () => {
    const posterior = createPriorPosterior();
    expect(Array.isArray(posterior)).toBe(true);
    expect(posterior.length).toBeGreaterThan(0);
    expect(posterior.every((p) => typeof p === "number" && p >= 0)).toBe(true);
  });

  it("sums to approximately 1", () => {
    const posterior = createPriorPosterior();
    const sum = posterior.reduce((acc, p) => acc + p, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});

describe("summarizePosterior", () => {
  it("returns expected shape with all required fields", () => {
    const posterior = createPriorPosterior();
    const summary = summarizePosterior(posterior);

    expect(summary).toHaveProperty("thetaMean");
    expect(summary).toHaveProperty("thetaLow");
    expect(summary).toHaveProperty("thetaHigh");
    expect(summary).toHaveProperty("levelProbabilities");
    expect(summary).toHaveProperty("bestLevel");
    expect(summary).toHaveProperty("confidence");
    expect(summary).toHaveProperty("borderlineLabel");
  });

  it("levelProbabilities contains all 6 CEFR levels", () => {
    const posterior = createPriorPosterior();
    const summary = summarizePosterior(posterior);
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
    for (const level of levels) {
      expect(summary.levelProbabilities).toHaveProperty(level);
      expect(typeof summary.levelProbabilities[level]).toBe("number");
    }
  });

  it("bestLevel is a valid CEFR level", () => {
    const posterior = createPriorPosterior();
    const summary = summarizePosterior(posterior);
    const validLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    expect(validLevels).toContain(summary.bestLevel);
  });
});

describe("parseAssessmentState", () => {
  const validBase: AssessmentState = {
    posterior: createPriorPosterior(),
    usedItemIds: ["item-1", "item-2"],
    askedLevels: ["A1", "B1"],
    pendingItemId: "item-3",
    answeredCount: 2,
    totalResponseTimeMs: 3000,
    timedResponseCount: 2,
  };

  it("parses a valid state object correctly", () => {
    const parsed = parseAssessmentState(validBase);
    expect(parsed.usedItemIds).toEqual(["item-1", "item-2"]);
    expect(parsed.askedLevels).toEqual(["A1", "B1"]);
    expect(parsed.pendingItemId).toBe("item-3");
    expect(parsed.answeredCount).toBe(2);
    expect(parsed.totalResponseTimeMs).toBe(3000);
    expect(parsed.timedResponseCount).toBe(2);
  });

  it("normalizes the posterior array", () => {
    const raw = {
      ...validBase,
      posterior: createPriorPosterior().map((p) => p * 2),
    };
    const parsed = parseAssessmentState(raw);
    const sum = parsed.posterior.reduce((acc, p) => acc + p, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("rejects non-object input with error", () => {
    expect(() => parseAssessmentState(null)).toThrow("Invalid assessment state.");
    expect(() => parseAssessmentState("string")).toThrow("Invalid assessment state.");
    expect(() => parseAssessmentState(42)).toThrow("Invalid assessment state.");
  });

  it("rejects missing arrays with error", () => {
    expect(() => parseAssessmentState({})).toThrow("Invalid assessment state shape.");
    expect(() => parseAssessmentState({ posterior: [] })).toThrow("Invalid assessment state shape.");
    expect(() =>
      parseAssessmentState({ posterior: [], usedItemIds: [] }),
    ).toThrow("Invalid assessment state shape.");
  });

  it("rejects wrong posterior length with error", () => {
    const badState = {
      ...validBase,
      posterior: [0.5, 0.5],
    };
    expect(() => parseAssessmentState(badState)).toThrow("Invalid posterior length.");
  });

  it("filters invalid askedLevels", () => {
    const raw = {
      ...validBase,
      askedLevels: ["A1", "invalid", "B2", null, undefined, 123],
    };
    const parsed = parseAssessmentState(raw);
    expect(parsed.askedLevels).toEqual(["A1", "B2"]);
  });

  it("handles optional fields with defaults", () => {
    const raw = {
      posterior: validBase.posterior,
      usedItemIds: validBase.usedItemIds,
      askedLevels: validBase.askedLevels,
    };
    const parsed = parseAssessmentState(raw);
    expect(parsed.pendingItemId).toBeNull();
    expect(parsed.answeredCount).toBe(0);
    expect(parsed.totalResponseTimeMs).toBe(0);
    expect(parsed.timedResponseCount).toBe(0);
  });
});

describe("toPublicItem", () => {
  const item: AssessmentItem = {
    id: "item-1",
    text: "What does 'run out of' mean?",
    type: "meaning",
    level: "B1",
    options: ["escape", "exhaust", "enter", "explode"],
    correctIndex: 1,
    difficulty: 0.5,
  };

  it("strips correctIndex from the item", () => {
    const publicItem = toPublicItem(item);
    expect(publicItem).not.toHaveProperty("correctIndex");
  });

  it("preserves all other fields", () => {
    const publicItem = toPublicItem(item);
    expect(publicItem.id).toBe(item.id);
    expect(publicItem.text).toBe(item.text);
    expect(publicItem.type).toBe(item.type);
    expect(publicItem.level).toBe(item.level);
    expect(publicItem.options).toEqual(item.options);
    expect(publicItem.difficulty).toBe(item.difficulty);
  });
});
