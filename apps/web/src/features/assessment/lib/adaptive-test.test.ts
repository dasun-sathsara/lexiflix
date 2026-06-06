import { describe, expect, it } from "vitest";
import { ITEM_BANK } from "@/features/assessment/data/item-bank";
import type {
  AssessmentItem,
  AssessmentState,
  PosteriorSummary,
} from "@/features/assessment/types";
import {
  ASSESSMENT_LIMITS,
  FAST_RESPONSE_EXTRA_ITEMS,
  FAST_RESPONSE_THRESHOLD_MS,
} from "@/lib/constants";
import { createPriorPosterior, THETA_GRID, updatePosterior } from "./ability-model";
import {
  applyAnswerToState,
  expectedPosteriorEntropy,
  getItemById,
  getMinimumItems,
  initializeAssessmentState,
  parseAssessmentState,
  SELECTION,
  STOPPING_RULE,
  selectFirstItem,
  selectNextItem,
  shouldStopAssessment,
  toPublicItem,
} from "./adaptive-test";

/** Always draws the top shortlist entry, making selection deterministic. */
const alwaysFirst = () => 0;

const syntheticItem: AssessmentItem = {
  id: "synthetic",
  text: "synthetic item",
  type: "cloze",
  level: "B1",
  options: ["a", "b", "c", "d"],
  correctIndex: 0,
  difficulty: 0,
};

function stateWith(overrides: Partial<AssessmentState> = {}): AssessmentState {
  return {
    posterior: createPriorPosterior(),
    usedItemIds: [],
    askedLevels: [],
    pendingItemId: null,
    answeredCount: 0,
    totalResponseTimeMs: 0,
    timedResponseCount: 0,
    ...overrides,
  };
}

/** A confident summary whose credible interval sits inside a single CEFR band. */
function confidentSummary(overrides: Partial<PosteriorSummary> = {}): PosteriorSummary {
  return {
    thetaMean: 0.4,
    thetaLow: 0.1,
    thetaHigh: 0.7,
    levelProbabilities: { A1: 0, A2: 0, B1: 0.1, B2: 0.85, C1: 0.05, C2: 0 },
    bestLevel: "B2",
    confidence: 0.85,
    borderlineLabel: null,
    ...overrides,
  };
}

function pendingItemOf(state: AssessmentState): AssessmentItem {
  const item = state.pendingItemId ? getItemById(state.pendingItemId) : null;

  if (!item) {
    throw new Error("Expected a pending item.");
  }

  return item;
}

describe("item lookup", () => {
  it("finds bank items and returns null for unknown ids", () => {
    const first = ITEM_BANK[0];

    if (!first) {
      throw new Error("Item bank is empty.");
    }

    expect(getItemById(first.id)).toEqual(first);
    expect(getItemById("does-not-exist")).toBeNull();
  });

  it("strips correctIndex when publishing an item", () => {
    const publicItem = toPublicItem(syntheticItem);

    expect(publicItem).not.toHaveProperty("correctIndex");
    expect(publicItem).toEqual({
      id: syntheticItem.id,
      text: syntheticItem.text,
      type: syntheticItem.type,
      level: syntheticItem.level,
      options: syntheticItem.options,
      difficulty: syntheticItem.difficulty,
    });
  });
});

describe("expectedPosteriorEntropy", () => {
  it("prefers items near the current estimate over far-off ones", () => {
    const posterior = createPriorPosterior();

    expect(expectedPosteriorEntropy(posterior, { ...syntheticItem, difficulty: 0 })).toBeLessThan(
      expectedPosteriorEntropy(posterior, { ...syntheticItem, difficulty: 2.8 }),
    );
  });
});

describe("selectFirstItem", () => {
  it("opens with an item close to the middle of the ability scale", () => {
    const closestDistance = Math.min(...ITEM_BANK.map((item) => Math.abs(item.difficulty)));

    expect(Math.abs(selectFirstItem(alwaysFirst).difficulty)).toBe(closestDistance);
  });
});

describe("selectNextItem", () => {
  it("never repeats an item that was already used", () => {
    const used = ITEM_BANK.slice(0, 5).map((item) => item.id);
    const next = selectNextItem(stateWith({ usedItemIds: used }), alwaysFirst);

    expect(next).not.toBeNull();
    expect(used).not.toContain(next?.id);
  });

  it("returns null once the bank is exhausted", () => {
    const allIds = ITEM_BANK.map((item) => item.id);

    expect(selectNextItem(stateWith({ usedItemIds: allIds }), alwaysFirst)).toBeNull();
  });

  it("breaks a run of same-level items", () => {
    const run: AssessmentState["askedLevels"] = Array.from(
      { length: SELECTION.maxConsecutiveSameLevel },
      () => "A1",
    );

    expect(selectNextItem(stateWith({ askedLevels: run }), alwaysFirst)?.level).not.toBe("A1");
  });

  it("follows the belief upwards after correct answers on hard items", () => {
    let posterior = createPriorPosterior();

    for (let index = 0; index < 6; index += 1) {
      posterior = updatePosterior(posterior, { difficulty: 1, isCorrect: true });
    }

    const next = selectNextItem(stateWith({ posterior }), alwaysFirst);

    expect(next?.difficulty ?? 0).toBeGreaterThan(selectFirstItem(alwaysFirst).difficulty);
  });
});

describe("getMinimumItems", () => {
  it("uses the standard floor when no response times were recorded", () => {
    expect(getMinimumItems(stateWith())).toBe(ASSESSMENT_LIMITS.minItems);
  });

  it("uses the standard floor for normal answering speed", () => {
    const state = stateWith({ timedResponseCount: 4, totalResponseTimeMs: 4 * 4000 });

    expect(getMinimumItems(state)).toBe(ASSESSMENT_LIMITS.minItems);
  });

  it("raises the floor when answers arrive suspiciously fast", () => {
    const state = stateWith({
      timedResponseCount: 4,
      totalResponseTimeMs: 4 * (FAST_RESPONSE_THRESHOLD_MS - 100),
    });

    expect(getMinimumItems(state)).toBe(
      Math.min(ASSESSMENT_LIMITS.maxItems, ASSESSMENT_LIMITS.minItems + FAST_RESPONSE_EXTRA_ITEMS),
    );
  });

  it("never raises the floor above the hard maximum", () => {
    const state = stateWith({ timedResponseCount: 1, totalResponseTimeMs: 1 });

    expect(getMinimumItems(state)).toBeLessThanOrEqual(ASSESSMENT_LIMITS.maxItems);
  });
});

describe("shouldStopAssessment", () => {
  it("stops at the hard maximum regardless of confidence", () => {
    const state = stateWith({ answeredCount: ASSESSMENT_LIMITS.maxItems });

    expect(shouldStopAssessment(state, confidentSummary({ confidence: 0.1 }))).toBe(true);
  });

  it("keeps going before the minimum item count even when confident", () => {
    const state = stateWith({ answeredCount: ASSESSMENT_LIMITS.minItems - 1 });

    expect(shouldStopAssessment(state, confidentSummary())).toBe(false);
  });

  it("stops once the belief is confident and contained in one band", () => {
    const state = stateWith({ answeredCount: ASSESSMENT_LIMITS.minItems });

    expect(shouldStopAssessment(state, confidentSummary())).toBe(true);
  });

  it("keeps going while confidence is below the threshold", () => {
    const state = stateWith({ answeredCount: ASSESSMENT_LIMITS.minItems });
    const summary = confidentSummary({ confidence: STOPPING_RULE.minimumConfidence - 0.01 });

    expect(shouldStopAssessment(state, summary)).toBe(false);
  });

  it("keeps going while the credible interval spans too many CEFR bands", () => {
    const state = stateWith({ answeredCount: ASSESSMENT_LIMITS.minItems });

    expect(shouldStopAssessment(state, confidentSummary({ thetaLow: -1, thetaHigh: 1 }))).toBe(
      false,
    );
  });

  it("tolerates a single boundary inside the credible interval", () => {
    const state = stateWith({ answeredCount: ASSESSMENT_LIMITS.minItems });

    expect(shouldStopAssessment(state, confidentSummary({ thetaLow: -0.1, thetaHigh: 0.4 }))).toBe(
      true,
    );
  });
});

describe("initializeAssessmentState", () => {
  it("starts from the prior with the opening item already reserved", () => {
    const { state, firstItem } = initializeAssessmentState();

    expect(state.posterior).toEqual(createPriorPosterior());
    expect(state.pendingItemId).toBe(firstItem.id);
    expect(state.usedItemIds).toEqual([firstItem.id]);
    expect(state.askedLevels).toEqual([firstItem.level]);
    expect(state.answeredCount).toBe(0);
  });
});

describe("applyAnswerToState", () => {
  it("advances to the next question and counts the answer", () => {
    const { state, firstItem } = initializeAssessmentState();
    const outcome = applyAnswerToState({
      state,
      item: firstItem,
      isCorrect: true,
      responseTimeMs: 4200,
    });

    if (outcome.status !== "in_progress") {
      throw new Error("Expected the attempt to continue.");
    }

    expect(outcome.state.answeredCount).toBe(1);
    expect(outcome.state.pendingItemId).toBe(outcome.nextItem.id);
    expect(outcome.state.usedItemIds).toContain(outcome.nextItem.id);
    expect(outcome.state.timedResponseCount).toBe(1);
    expect(outcome.state.totalResponseTimeMs).toBe(4200);
    expect(outcome.summary.thetaMean).toBeGreaterThan(0);
    expect(outcome.maxItems).toBe(ASSESSMENT_LIMITS.maxItems);
  });

  it("ignores a missing response time instead of skewing the average", () => {
    const { state, firstItem } = initializeAssessmentState();
    const outcome = applyAnswerToState({
      state,
      item: firstItem,
      isCorrect: false,
      responseTimeMs: null,
    });

    expect(outcome.state.timedResponseCount).toBe(0);
    expect(outcome.state.totalResponseTimeMs).toBe(0);
  });

  it("completes an attempt within the configured item budget", () => {
    let state = initializeAssessmentState().state;
    let answered = 0;
    let completed = false;

    while (answered < ASSESSMENT_LIMITS.maxItems) {
      const outcome = applyAnswerToState({
        state,
        item: pendingItemOf(state),
        isCorrect: true,
        responseTimeMs: 5000,
      });
      answered += 1;

      if (outcome.status === "completed") {
        expect(outcome.result.answeredCount).toBe(answered);
        expect(outcome.result.confidence).toBeGreaterThan(0);
        completed = true;
        break;
      }

      state = outcome.state;
    }

    expect(completed).toBe(true);
    expect(answered).toBeGreaterThanOrEqual(ASSESSMENT_LIMITS.minItems);
    expect(answered).toBeLessThanOrEqual(ASSESSMENT_LIMITS.maxItems);
  });

  it("stops early once a consistently wrong learner is pinned to A1", () => {
    let state = initializeAssessmentState().state;
    let answered = 0;
    let stoppedAt = 0;

    while (answered < ASSESSMENT_LIMITS.maxItems) {
      const outcome = applyAnswerToState({
        state,
        item: pendingItemOf(state),
        isCorrect: false,
        responseTimeMs: 5000,
      });
      answered += 1;

      if (outcome.status === "completed") {
        stoppedAt = answered;
        expect(outcome.result.bestLevel).toBe("A1");
        expect(outcome.result.confidence).toBeGreaterThanOrEqual(STOPPING_RULE.minimumConfidence);
        break;
      }

      state = outcome.state;
    }

    expect(stoppedAt).toBe(ASSESSMENT_LIMITS.minItems);
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
    const parsed = parseAssessmentState({
      ...validBase,
      posterior: createPriorPosterior().map((probability) => probability * 2),
    });

    expect(parsed.posterior.reduce((total, value) => total + value, 0)).toBeCloseTo(1, 5);
  });

  it("rejects non-object input with error", () => {
    expect(() => parseAssessmentState(null)).toThrow("Invalid assessment state.");
    expect(() => parseAssessmentState("string")).toThrow("Invalid assessment state.");
    expect(() => parseAssessmentState(42)).toThrow("Invalid assessment state.");
  });

  it("rejects missing arrays with error", () => {
    expect(() => parseAssessmentState({})).toThrow("Invalid assessment state shape.");
    expect(() => parseAssessmentState({ posterior: [] })).toThrow(
      "Invalid assessment state shape.",
    );
    expect(() => parseAssessmentState({ posterior: [], usedItemIds: [] })).toThrow(
      "Invalid assessment state shape.",
    );
  });

  it("rejects a posterior that does not line up with the ability grid", () => {
    expect(() => parseAssessmentState({ ...validBase, posterior: [0.5, 0.5] })).toThrow(
      "Invalid posterior length.",
    );
    expect(() =>
      parseAssessmentState({
        ...validBase,
        posterior: THETA_GRID.map((_, index) => (index === 0 ? Number.NaN : 1)),
      }),
    ).toThrow("Invalid posterior length.");
  });

  it("filters invalid askedLevels", () => {
    const parsed = parseAssessmentState({
      ...validBase,
      askedLevels: ["A1", "invalid", "B2", null, undefined, 123],
    });

    expect(parsed.askedLevels).toEqual(["A1", "B2"]);
  });

  it("handles optional fields with defaults", () => {
    const parsed = parseAssessmentState({
      posterior: validBase.posterior,
      usedItemIds: validBase.usedItemIds,
      askedLevels: validBase.askedLevels,
    });

    expect(parsed.pendingItemId).toBeNull();
    expect(parsed.answeredCount).toBe(0);
    expect(parsed.totalResponseTimeMs).toBe(0);
    expect(parsed.timedResponseCount).toBe(0);
  });
});
