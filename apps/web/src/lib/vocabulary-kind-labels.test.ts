import { describe, expect, it } from "vitest";
import { formatVocabularyKindLabel } from "./vocabulary-kind-labels";

describe("formatVocabularyKindLabel", () => {
  it("formats each valid kind correctly", () => {
    expect(formatVocabularyKindLabel("word")).toBe("Words");
    expect(formatVocabularyKindLabel("phrasal_verb")).toBe("Phrasal verbs");
    expect(formatVocabularyKindLabel("idiom")).toBe("Idioms");
    expect(formatVocabularyKindLabel("slang")).toBe("Slang");
  });
});
