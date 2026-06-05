/**
 * NLP service contract tests.
 *
 * These tests ensure the TypeScript Zod schemas stay in sync with the Python
 * Pydantic models in apps/nlp_service/app/schemas/{requests,responses}.py.
 *
 * The fixture file (fixtures/nlp-analysis-response.json) is a representative
 * response derived from the Python AnalyzeResponse Pydantic model. It MUST be
 * regenerated whenever the Python schema changes — check the Pydantic models
 * as the source of truth.
 */
import { describe, expect, it } from "vitest";

import { nlpAnalysisRequestSchema, nlpAnalysisResponseSchema } from "./contracts";
import fixture from "./fixtures/nlp-analysis-response.json";

describe("NLP service response contract", () => {
  it("parses a representative Python service response without errors", () => {
    const result = nlpAnalysisResponseSchema.safeParse(fixture);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error(`Schema validation failed: ${JSON.stringify(result.error.issues)}`);
    }

    // Verify structural expectations
    expect(result.data.metadata.job_id).toBe("test-job-123");
    expect(result.data.metadata.total_lines).toBe(42);
    expect(result.data.metadata.total_characters).toBe(2048);
    expect(result.data.metadata.unique_candidates).toBe(3);
    expect(result.data.metadata.spacy_model).toBe("en_core_web_sm");
    expect(result.data.metadata.pipeline_version).toBe("media-analysis-v1");
    expect(result.data.candidates).toHaveLength(3);
    expect(result.data.warnings).toEqual(["Low confidence on 2 candidates"]);
  });

  it("accepts null cefr_level on candidates", () => {
    const result = nlpAnalysisResponseSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const nullCefrCandidate = result.data.candidates.find((c) => c.text === "serendipity");
    expect(nullCefrCandidate).toBeDefined();
    expect(nullCefrCandidate?.cefr_level).toBeNull();
  });

  it("accepts empty contexts list on candidates", () => {
    const result = nlpAnalysisResponseSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const emptyCtxCandidate = result.data.candidates.find((c) => c.text === "serendipity");
    expect(emptyCtxCandidate?.contexts).toEqual([]);
  });

  it("accepts a response with no warnings (defaults to empty array)", () => {
    const noWarnings = { ...fixture, warnings: undefined };
    const result = nlpAnalysisResponseSchema.safeParse(noWarnings);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.warnings).toEqual([]);
  });

  it("rejects a response missing required metadata fields", () => {
    const invalid = {
      ...fixture,
      metadata: { spacy_model: "en_core_web_sm" }, // missing total_lines, etc.
    };
    const result = nlpAnalysisResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects a candidate with count less than 1", () => {
    const invalid = {
      ...fixture,
      candidates: [{ ...fixture.candidates[0], count: 0 }],
    };
    const result = nlpAnalysisResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid CEFR level on a candidate", () => {
    const invalid = {
      ...fixture,
      candidates: [{ ...fixture.candidates[0], cefr_level: "Z9" }],
    };
    const result = nlpAnalysisResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("NLP service request contract", () => {
  it("produces the expected wire payload with all defaults", () => {
    const minimalInput = {
      content: "Hello world subtitle content.",
    };

    const result = nlpAnalysisRequestSchema.parse(minimalInput);

    expect(result).toEqual({
      job_id: undefined,
      content: "Hello world subtitle content.",
      content_type: "srt",
      pipeline_version: undefined,
      options: {
        include_propn: false,
        dedup_lines: true,
        batch_size: 200,
      },
    });
  });

  it("preserves explicit options when provided", () => {
    const input = {
      job_id: "workflow-abc",
      content: "Some text.",
      content_type: "plain_text" as const,
      pipeline_version: "v2",
      options: {
        include_propn: true,
        dedup_lines: false,
        batch_size: 500,
      },
    };

    const result = nlpAnalysisRequestSchema.parse(input);

    expect(result.job_id).toBe("workflow-abc");
    expect(result.content_type).toBe("plain_text");
    expect(result.pipeline_version).toBe("v2");
    expect(result.options.include_propn).toBe(true);
    expect(result.options.dedup_lines).toBe(false);
    expect(result.options.batch_size).toBe(500);
  });

  it("rejects batch_size outside allowed range", () => {
    const tooSmall = nlpAnalysisRequestSchema.safeParse({
      content: "text",
      options: { batch_size: 0 },
    });
    expect(tooSmall.success).toBe(false);

    const tooLarge = nlpAnalysisRequestSchema.safeParse({
      content: "text",
      options: { batch_size: 10_001 },
    });
    expect(tooLarge.success).toBe(false);
  });

  it("rejects empty content", () => {
    const result = nlpAnalysisRequestSchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
  });
});
