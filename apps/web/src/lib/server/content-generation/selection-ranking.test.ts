import { describe, expect, it } from "vitest";

import {
  allowedLevels,
  KNOWN_TERM_PENALTY,
  knownTermPenalty,
  preferenceScore,
  selectionComparator,
  UNRANKED_FREQUENCY_RANK,
} from "./selection-ranking";

describe("allowedLevels", () => {
  it("returns all CEFR levels when learner level is null", () => {
    const levels = allowedLevels(null, "same_level");
    expect(levels).toEqual(new Set(["A1", "A2", "B1", "B2", "C1", "C2"]));
  });

  it("returns all CEFR levels regardless of mode when level is null", () => {
    expect(allowedLevels(null, "one_level_above")).toEqual(
      new Set(["A1", "A2", "B1", "B2", "C1", "C2"]),
    );
    expect(allowedLevels(null, "all_levels_above")).toEqual(
      new Set(["A1", "A2", "B1", "B2", "C1", "C2"]),
    );
  });

  describe("same_level mode", () => {
    it("returns only the learner's level", () => {
      expect(allowedLevels("B1", "same_level")).toEqual(new Set(["B1"]));
    });

    it("works at the boundaries", () => {
      expect(allowedLevels("A1", "same_level")).toEqual(new Set(["A1"]));
      expect(allowedLevels("C2", "same_level")).toEqual(new Set(["C2"]));
    });
  });

  describe("one_level_above mode", () => {
    it("returns current level and one above", () => {
      expect(allowedLevels("B1", "one_level_above")).toEqual(new Set(["B1", "B2"]));
    });

    it("returns only the level at C2 (no level above)", () => {
      expect(allowedLevels("C2", "one_level_above")).toEqual(new Set(["C2"]));
    });

    it("returns A1 and A2 for A1", () => {
      expect(allowedLevels("A1", "one_level_above")).toEqual(new Set(["A1", "A2"]));
    });
  });

  describe("all_levels_above mode", () => {
    it("returns current level and all above", () => {
      expect(allowedLevels("B1", "all_levels_above")).toEqual(new Set(["B1", "B2", "C1", "C2"]));
    });

    it("returns all levels for A1", () => {
      expect(allowedLevels("A1", "all_levels_above")).toEqual(
        new Set(["A1", "A2", "B1", "B2", "C1", "C2"]),
      );
    });

    it("returns only C2 for C2", () => {
      expect(allowedLevels("C2", "all_levels_above")).toEqual(new Set(["C2"]));
    });
  });
});

describe("preferenceScore", () => {
  describe("common_first", () => {
    it("returns frequencyRank directly", () => {
      const item = { frequencyRank: 5, cefrLevel: "B1" as const, occurrenceCount: 10 };
      expect(preferenceScore(item, "common_first")).toBe(5);
    });

    it("uses UNRANKED_FREQUENCY_RANK when frequencyRank is null", () => {
      const item = { frequencyRank: null, cefrLevel: "B1" as const, occurrenceCount: 10 };
      expect(preferenceScore(item, "common_first")).toBe(UNRANKED_FREQUENCY_RANK);
    });
  });

  describe("challenge_first", () => {
    it("higher CEFR gets lower (better) score", () => {
      const c1Item = { frequencyRank: 1, cefrLevel: "C1" as const, occurrenceCount: 1 };
      const a1Item = { frequencyRank: 1, cefrLevel: "A1" as const, occurrenceCount: 1 };

      // C1 index is 4 → score = 4 * -10000 + 1 = -39999
      // A1 index is 0 → score = 0 * -10000 + 1 = 1
      expect(preferenceScore(c1Item, "challenge_first")).toBeLessThan(
        preferenceScore(a1Item, "challenge_first"),
      );
    });

    it("uses -1 for cefrIndex when cefrLevel is null", () => {
      const item = { frequencyRank: 10, cefrLevel: null, occurrenceCount: 1 };
      // cefrIndex = -1, score = -1 * -10000 + 10 = 10010
      expect(preferenceScore(item, "challenge_first")).toBe(10_010);
    });
  });

  describe("balanced", () => {
    it("balances frequency rank and occurrence count", () => {
      const item = { frequencyRank: 100, cefrLevel: "B1" as const, occurrenceCount: 8 };
      // score = 100 - 8 * 5 = 60
      expect(preferenceScore(item, "balanced")).toBe(60);
    });

    it("high occurrence items get lower (better) scores", () => {
      const highOccurrence = { frequencyRank: 50, cefrLevel: "B1" as const, occurrenceCount: 20 };
      const lowOccurrence = { frequencyRank: 50, cefrLevel: "B1" as const, occurrenceCount: 2 };

      expect(preferenceScore(highOccurrence, "balanced")).toBeLessThan(
        preferenceScore(lowOccurrence, "balanced"),
      );
    });
  });
});

describe("knownTermPenalty", () => {
  it("returns 0 when handling is not downrank_known", () => {
    expect(knownTermPenalty("known", "exclude_known")).toBe(0);
    expect(knownTermPenalty("known", "include_known")).toBe(0);
  });

  it("returns KNOWN_TERM_PENALTY for known terms with downrank_known", () => {
    expect(knownTermPenalty("known", "downrank_known")).toBe(KNOWN_TERM_PENALTY);
  });

  it("returns 0 for non-known terms with downrank_known", () => {
    expect(knownTermPenalty("learning", "downrank_known")).toBe(0);
    expect(knownTermPenalty("unseen", "downrank_known")).toBe(0);
    expect(knownTermPenalty(null, "downrank_known")).toBe(0);
  });
});

describe("selectionComparator", () => {
  const baseItem = {
    frequencyRank: 10,
    cefrLevel: "B1" as const,
    occurrenceCount: 5,
    displayText: "alpha",
    termState: null as "known" | "learning" | "ignored" | "unseen" | null,
  };

  it("sorts known terms last with downrank_known", () => {
    const known = { ...baseItem, termState: "known" as const, displayText: "aardvark" };
    const unknown = { ...baseItem, termState: null, displayText: "zebra" };

    const result = selectionComparator(known, unknown, {
      knownTermHandling: "downrank_known",
      frequencyPreference: "balanced",
    });

    expect(result).toBeGreaterThan(0); // known sorts after unknown
  });

  it("falls back to preference score when penalty is equal", () => {
    const common = { ...baseItem, frequencyRank: 1 };
    const rare = { ...baseItem, frequencyRank: 100 };

    const result = selectionComparator(common, rare, {
      knownTermHandling: "exclude_known",
      frequencyPreference: "common_first",
    });

    expect(result).toBeLessThan(0); // lower rank sorts first
  });

  it("falls back to displayText localeCompare when scores are equal", () => {
    const apple = { ...baseItem, displayText: "apple" };
    const banana = { ...baseItem, displayText: "banana" };

    const result = selectionComparator(apple, banana, {
      knownTermHandling: "exclude_known",
      frequencyPreference: "balanced",
    });

    expect(result).toBeLessThan(0); // apple < banana alphabetically
  });
});
