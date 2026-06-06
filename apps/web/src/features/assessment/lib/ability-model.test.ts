import { describe, expect, it } from "vitest";
import { CEFR_LEVELS } from "@/lib/domain/cefr";
import {
  ABILITY_SCALE,
  CEFR_BAND_BOUNDARIES,
  countBoundariesSpanned,
  createPriorPosterior,
  levelForTheta,
  probabilityCorrect,
  RESPONSE_MODEL,
  summarizePosterior,
  THETA_GRID,
  updatePosterior,
} from "./ability-model";

function sum(values: readonly number[]) {
  return values.reduce((total, value) => total + value, 0);
}

describe("THETA_GRID", () => {
  it("covers the ability scale at the configured resolution", () => {
    expect(THETA_GRID[0]).toBe(ABILITY_SCALE.min);
    expect(THETA_GRID[THETA_GRID.length - 1]).toBe(ABILITY_SCALE.max);
    expect(THETA_GRID).toHaveLength(
      Math.round((ABILITY_SCALE.max - ABILITY_SCALE.min) / ABILITY_SCALE.step) + 1,
    );
  });

  it("is strictly increasing", () => {
    for (let index = 1; index < THETA_GRID.length; index += 1) {
      expect(THETA_GRID[index] ?? 0).toBeGreaterThan(THETA_GRID[index - 1] ?? 0);
    }
  });
});

describe("levelForTheta", () => {
  it("maps ability values onto CEFR bands", () => {
    expect(levelForTheta(-3)).toBe("A1");
    expect(levelForTheta(-1)).toBe("A2");
    expect(levelForTheta(-0.5)).toBe("B1");
    expect(levelForTheta(0.5)).toBe("B2");
    expect(levelForTheta(1)).toBe("C1");
    expect(levelForTheta(3)).toBe("C2");
  });

  it("treats a boundary as the start of the higher band", () => {
    expect(levelForTheta(-1.5)).toBe("A2");
    expect(levelForTheta(0)).toBe("B2");
    expect(levelForTheta(1.5)).toBe("C2");
  });
});

describe("countBoundariesSpanned", () => {
  it("counts the CEFR cuts strictly inside an interval", () => {
    expect(CEFR_BAND_BOUNDARIES).toEqual([-1.5, -0.75, 0, 0.75, 1.5]);
    expect(countBoundariesSpanned(0.1, 0.7)).toBe(0);
    expect(countBoundariesSpanned(-0.1, 0.1)).toBe(1);
    expect(countBoundariesSpanned(-1, 1)).toBe(3);
    expect(countBoundariesSpanned(-3, 3)).toBe(5);
  });
});

describe("probabilityCorrect", () => {
  it("never drops below the guessing floor", () => {
    expect(probabilityCorrect(-3, 3)).toBeGreaterThan(RESPONSE_MODEL.guessing);
    expect(probabilityCorrect(-3, 3)).toBeLessThan(RESPONSE_MODEL.guessing + 0.01);
  });

  it("sits halfway between guessing and certainty when ability matches difficulty", () => {
    expect(probabilityCorrect(0.4, 0.4)).toBeCloseTo((1 + RESPONSE_MODEL.guessing) / 2, 10);
  });

  it("increases with ability and decreases with difficulty", () => {
    expect(probabilityCorrect(1, 0)).toBeGreaterThan(probabilityCorrect(0, 0));
    expect(probabilityCorrect(0, 1)).toBeLessThan(probabilityCorrect(0, 0));
  });

  it("approaches certainty for ability far above difficulty", () => {
    expect(probabilityCorrect(3, -3)).toBeGreaterThan(0.99);
  });
});

describe("createPriorPosterior", () => {
  it("returns one non-negative probability per grid point, summing to 1", () => {
    const posterior = createPriorPosterior();

    expect(posterior).toHaveLength(THETA_GRID.length);
    expect(posterior.every((probability) => probability >= 0)).toBe(true);
    expect(sum(posterior)).toBeCloseTo(1, 5);
  });

  it("is centred on the middle of the ability scale", () => {
    expect(summarizePosterior(createPriorPosterior()).thetaMean).toBeCloseTo(0, 5);
  });
});

describe("updatePosterior", () => {
  it("shifts the estimate up after a correct answer and down after a wrong one", () => {
    const prior = createPriorPosterior();
    const afterCorrect = updatePosterior(prior, { difficulty: 0, isCorrect: true });
    const afterWrong = updatePosterior(prior, { difficulty: 0, isCorrect: false });

    expect(summarizePosterior(afterCorrect).thetaMean).toBeGreaterThan(0);
    expect(summarizePosterior(afterWrong).thetaMean).toBeLessThan(0);
    expect(sum(afterCorrect)).toBeCloseTo(1, 5);
    expect(sum(afterWrong)).toBeCloseTo(1, 5);
  });

  it("narrows the credible interval as consistent evidence accumulates", () => {
    const prior = createPriorPosterior();
    let posterior = prior;

    for (let index = 0; index < 8; index += 1) {
      posterior = updatePosterior(posterior, { difficulty: 1, isCorrect: true });
    }

    expect(widthOf(posterior)).toBeLessThan(widthOf(prior));
  });

  it("converges on a high level when every hard item is answered correctly", () => {
    let posterior = createPriorPosterior();

    for (let index = 0; index < 12; index += 1) {
      posterior = updatePosterior(posterior, { difficulty: 1.8, isCorrect: true });
    }

    const summary = summarizePosterior(posterior);

    expect(summary.thetaMean).toBeGreaterThan(1.5);
    expect(summary.bestLevel).toBe("C2");
  });
});

describe("summarizePosterior", () => {
  it("reports a level distribution, winner, and credible interval", () => {
    const summary = summarizePosterior(createPriorPosterior());

    expect(Object.keys(summary.levelProbabilities)).toEqual([...CEFR_LEVELS]);
    expect(sum(Object.values(summary.levelProbabilities))).toBeCloseTo(1, 5);
    expect(CEFR_LEVELS).toContain(summary.bestLevel);
    expect(summary.confidence).toBe(summary.levelProbabilities[summary.bestLevel]);
    expect(summary.thetaLow).toBeLessThan(summary.thetaHigh);
  });

  it("labels a split between adjacent levels as borderline", () => {
    // Mass just either side of the B1/B2 cut at theta = 0.
    expect(summarizePosterior(spikeAt([-0.05, 0.05])).borderlineLabel).toMatch(
      /^B[12] \(borderline B[12]\)$/,
    );
  });

  it("does not label a confident result as borderline", () => {
    const summary = summarizePosterior(spikeAt([0.3]));

    expect(summary.bestLevel).toBe("B2");
    expect(summary.confidence).toBe(1);
    expect(summary.borderlineLabel).toBeNull();
  });

  it("does not label non-adjacent runners-up as borderline", () => {
    expect(summarizePosterior(spikeAt([-2.5, 2.5])).borderlineLabel).toBeNull();
  });
});

/** Builds a distribution with equal mass on the grid points closest to `thetas`. */
function spikeAt(thetas: number[]) {
  const indexes = thetas.map((theta) =>
    THETA_GRID.reduce(
      (best, value, index) =>
        Math.abs(value - theta) < Math.abs((THETA_GRID[best] ?? 0) - theta) ? index : best,
      0,
    ),
  );

  return THETA_GRID.map((_, index) => (indexes.includes(index) ? 1 / indexes.length : 0));
}

function widthOf(posterior: readonly number[]) {
  const summary = summarizePosterior(posterior);

  return summary.thetaHigh - summary.thetaLow;
}
