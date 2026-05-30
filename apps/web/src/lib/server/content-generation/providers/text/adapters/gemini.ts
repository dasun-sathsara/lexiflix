import "server-only";

import { GoogleGenAI, type Schema, Type } from "@google/genai";
import { env } from "@/lib/config/env";
import type { TextGenerationAdapter } from "@/lib/server/content-generation/providers/text/port";

const geminiClient = new GoogleGenAI({
  vertexai: true,
  apiKey: env.GOOGLE_CLOUD_API_KEY,
});

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          analysisItemId: { type: Type.STRING },
          termId: { type: Type.STRING },
          meaning: { type: Type.STRING },
          exampleSentences: { type: Type.ARRAY, items: { type: Type.STRING } },
          imageBrief: { type: Type.STRING, nullable: true },
          imageEligibility: {
            type: Type.OBJECT,
            properties: {
              eligible: { type: Type.BOOLEAN },
              reason: { type: Type.STRING },
            },
            required: ["eligible", "reason"],
          },
          warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["analysisItemId", "termId", "meaning", "exampleSentences", "imageEligibility"],
      },
    },
  },
  required: ["items"],
};

export function createGeminiTextAdapter(): TextGenerationAdapter {
  return {
    provider: "gemini",
    async generateBatch(request) {
      const response = await geminiClient.models.generateContent({
        model: request.model,
        contents: request.prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
        },
      });

      if (!response.text) {
        throw new Error("Gemini returned empty content.");
      }

      return JSON.parse(response.text);
    },
  };
}
