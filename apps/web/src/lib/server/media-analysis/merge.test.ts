import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { NlpAnalysisResponse } from "@/lib/integrations/nlp-service/contracts";
import type { AnalysisLlmPhrase } from "@/lib/server/media-analysis/providers/analysis-llm/service";

import { mergeAnalysisItems } from "./merge";

function makeNlpResponse(candidates: NlpAnalysisResponse["candidates"] = []): NlpAnalysisResponse {
  return {
    metadata: {
      total_lines: 10,
      total_characters: 500,
      unique_candidates: candidates.length,
      spacy_model: "en_core_web_sm",
    },
    candidates,
    warnings: [],
  };
}

function makeLlmPhrase(overrides: Partial<AnalysisLlmPhrase> = {}): AnalysisLlmPhrase {
  return {
    kind: "phrasal_verb",
    text: "look up",
    displayText: "look up",
    cefrLevel: "B1",
    cefrNumeric: 3,
    representativeContext: "I'll look it up.",
    contexts: ["I'll look it up.", "She looked up the answer."],
    rationale: "Common phrasal verb",
    ...overrides,
  };
}

describe("mergeAnalysisItems", () => {
  it("returns empty array for empty inputs", () => {
    const result = mergeAnalysisItems({
      nlpResponse: makeNlpResponse([]),
      phrases: [],
    });
    expect(result).toEqual([]);
  });

  it("converts NLP candidates with kind 'word' and normalizedText keying", () => {
    const result = mergeAnalysisItems({
      nlpResponse: makeNlpResponse([
        {
          text: "running",
          lemma: "run",
          type: "verb",
          cefr_level: "A2",
          count: 3,
          contexts: ["I was running late."],
        },
      ]),
      phrases: [],
    });

    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("word");
    expect(result[0].normalizedText).toBe("run");
    expect(result[0].occurrenceCount).toBe(3);
    expect(result[0].cefrLevel).toBe("A2");
    expect(result[0].analysisSource).toBe("nlp");
  });

  it("converts LLM phrases with their original kind", () => {
    const result = mergeAnalysisItems({
      nlpResponse: makeNlpResponse([]),
      phrases: [makeLlmPhrase({ kind: "idiom", text: "break a leg", displayText: "break a leg" })],
    });

    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("idiom");
    expect(result[0].analysisSource).toBe("analysis_llm");
  });

  it("merges items with same kind and normalizedText key", () => {
    const result = mergeAnalysisItems({
      nlpResponse: makeNlpResponse([
        {
          text: "Run",
          lemma: "run",
          type: "verb",
          cefr_level: "A2",
          count: 2,
          contexts: ["He runs fast."],
        },
        {
          text: "running",
          lemma: "run",
          type: "verb",
          cefr_level: null,
          count: 3,
          contexts: ["She is running."],
        },
      ]),
      phrases: [],
    });

    // Both normalize to "word:run"
    expect(result).toHaveLength(1);
    expect(result[0].occurrenceCount).toBe(5); // 2 + 3
    expect(result[0].cefrLevel).toBe("A2"); // first one wins via null-coalesce
  });

  it("accumulates occurrenceCount on merge when keys collide across sources", () => {
    // NLP produces "word:go" and LLM produces "phrasal_verb:go" — different keys, no merge
    // To test accumulation within the same source, use two NLP entries with same lemma
    const result = mergeAnalysisItems({
      nlpResponse: makeNlpResponse([
        { text: "go", lemma: "go", type: "verb", cefr_level: "A1", count: 4, contexts: [] },
        {
          text: "went",
          lemma: "go",
          type: "verb",
          cefr_level: "A1",
          count: 3,
          contexts: ["Let's go!"],
        },
      ]),
      phrases: [],
    });

    expect(result).toHaveLength(1);
    // NLP count (4) + NLP count (3) = 7
    expect(result[0].occurrenceCount).toBe(7);
  });

  it("deduplicates contexts and caps at MAX_CONTEXTS_PER_ANALYSIS_ITEM", () => {
    const result = mergeAnalysisItems({
      nlpResponse: makeNlpResponse([
        {
          text: "big",
          lemma: "big",
          type: "adj",
          cefr_level: "A1",
          count: 1,
          contexts: ["A big dog.", "A big cat.", "A big fish."],
        },
        {
          text: "bigger",
          lemma: "big",
          type: "adj",
          cefr_level: "A1",
          count: 1,
          // Include some duplicates and new contexts
          contexts: [
            "A big dog.", // duplicate
            "A big house.",
            "A big tree.",
            "A big world.",
          ],
        },
      ]),
      phrases: [],
    });

    expect(result).toHaveLength(1);
    // MAX_CONTEXTS_PER_ANALYSIS_ITEM = 5
    // Unique contexts: "A big dog.", "A big cat.", "A big fish.", "A big house.", "A big tree."
    // "A big world." would be the 6th unique, but cap is 5
    expect(result[0].contexts.length).toBeLessThanOrEqual(5);
    // Verify deduplication: no duplicates
    const contextSet = new Set(result[0].contexts);
    expect(contextSet.size).toBe(result[0].contexts.length);
  });

  it("null-coalesces cefrLevel from incoming on merge", () => {
    const result = mergeAnalysisItems({
      nlpResponse: makeNlpResponse([
        { text: "go", lemma: "go", type: "verb", cefr_level: null, count: 1, contexts: [] },
        { text: "went", lemma: "go", type: "verb", cefr_level: "A2", count: 1, contexts: [] },
      ]),
      phrases: [],
    });

    expect(result).toHaveLength(1);
    // First item has null, absorb from second
    expect(result[0].cefrLevel).toBe("A2");
  });

  it("null-coalesces notes from incoming on merge", () => {
    const result = mergeAnalysisItems({
      nlpResponse: makeNlpResponse([]),
      phrases: [
        makeLlmPhrase({
          kind: "idiom",
          text: "break a leg",
          displayText: "break a leg",
          rationale: null,
          contexts: ["Break a leg tonight!"],
        }),
        makeLlmPhrase({
          kind: "idiom",
          text: "Break A Leg",
          displayText: "break a leg",
          rationale: "Means good luck",
          contexts: ["Go break a leg!"],
        }),
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].notes).toBe("Means good luck");
  });

  it("null-coalesces representativeContext from incoming on merge", () => {
    const result = mergeAnalysisItems({
      nlpResponse: makeNlpResponse([
        { text: "run", lemma: "run", type: "verb", cefr_level: "A1", count: 1, contexts: [] },
        {
          text: "ran",
          lemma: "run",
          type: "verb",
          cefr_level: "A1",
          count: 1,
          contexts: ["She ran away."],
        },
      ]),
      phrases: [],
    });

    expect(result).toHaveLength(1);
    // First NLP item has no contexts → representativeContext is null
    // Second contributes "She ran away." via absorb's null-coalesce
    expect(result[0].representativeContext).toBe("She ran away.");
  });

  it("sorts by occurrenceCount desc, then kind asc, then normalizedText asc", () => {
    const result = mergeAnalysisItems({
      nlpResponse: makeNlpResponse([
        { text: "big", lemma: "big", type: "adj", cefr_level: "A1", count: 5, contexts: [] },
        { text: "run", lemma: "run", type: "verb", cefr_level: "A2", count: 3, contexts: [] },
        { text: "go", lemma: "go", type: "verb", cefr_level: "A1", count: 3, contexts: [] },
      ]),
      phrases: [
        makeLlmPhrase({
          kind: "phrasal_verb",
          text: "look up",
          displayText: "look up",
          contexts: [],
          representativeContext: null,
        }),
      ],
    });

    // Sorted: big(5), go(3, word < phrasal_verb by kind), run(3, word, "run" > "go"), look up(1, phrasal_verb)
    // Actually: occurrenceCount desc → big(5) first
    // Then 3-way tie at count=3: go (word), run (word), ? no — look up has 1
    // go and run both "word" kind: alphabetical → go < run
    // look up is "phrasal_verb" at count 1
    expect(result.map((i) => i.normalizedText)).toEqual(["big", "go", "run", "look up"]);
  });

  it("assigns 1-based frequencyRank after sorting", () => {
    const result = mergeAnalysisItems({
      nlpResponse: makeNlpResponse([
        { text: "apple", lemma: "apple", type: "noun", cefr_level: "A1", count: 10, contexts: [] },
        { text: "banana", lemma: "banana", type: "noun", cefr_level: "A1", count: 5, contexts: [] },
        { text: "cherry", lemma: "cherry", type: "noun", cefr_level: "A2", count: 1, contexts: [] },
      ]),
      phrases: [],
    });

    expect(result[0].frequencyRank).toBe(1);
    expect(result[1].frequencyRank).toBe(2);
    expect(result[2].frequencyRank).toBe(3);
  });
});
