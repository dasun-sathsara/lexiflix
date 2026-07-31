import { zodResponseFormat } from "openai/helpers/zod";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { analysisLlmResponseSchema, analysisLlmWireResponseSchema } from "./schema";

describe("analysisLlmWireResponseSchema", () => {
  it("converts to a strict JSON Schema for structured outputs", () => {
    const format = zodResponseFormat(analysisLlmWireResponseSchema, "analysisLlmResponse");

    expect(format.json_schema.strict).toBe(true);

    const schema = format.json_schema.schema as {
      properties: {
        items: { items: { required: string[]; additionalProperties: boolean } };
      };
    };

    expect(schema.properties.items.items.additionalProperties).toBe(false);
    expect(schema.properties.items.items.required).toEqual([
      "kind",
      "text",
      "displayText",
      "cefrLevel",
      "representativeContext",
      "contexts",
      "rationale",
    ]);
  });

  it("rejects the lenient parse schema, which contains a transform", () => {
    // Regression guard: this is the failure the azure-foundry adapter hit
    // ("Transforms cannot be represented in JSON Schema").
    expect(() => zodResponseFormat(analysisLlmResponseSchema, "analysisLlmResponse")).toThrow(
      /Transforms cannot be represented in JSON Schema/,
    );
  });

  it("rejects the lenient parse schema, which contains a transform", () => {
    // Regression guard: this is the failure the azure-foundry adapter hit
    // ("Transforms cannot be represented in JSON Schema").
    expect(() => zodResponseFormat(analysisLlmResponseSchema, "analysisLlmResponse")).toThrow(
      /Transforms cannot be represented in JSON Schema/,
    );
  });

  it("accepts a wire payload through the lenient response schema", () => {
    const payload = {
      items: [
        {
          kind: "idiom",
          text: "spill the beans",
          displayText: "spill the beans",
          cefrLevel: "B2",
          representativeContext: "Don't spill the beans.",
          contexts: ["Don't spill the beans."],
          rationale: null,
        },
      ],
    };

    const parsed = analysisLlmResponseSchema.parse(analysisLlmWireResponseSchema.parse(payload));

    expect(parsed.items[0]).toMatchObject({
      kind: "idiom",
      text: "spill the beans",
      contexts: ["Don't spill the beans."],
    });
  });
});
