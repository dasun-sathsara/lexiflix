import "server-only";

import { logger } from "@trigger.dev/sdk";
import { AzureOpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

import { env } from "@/lib/env";
import {
  type AnalysisLlmItem,
  analysisLlmResponseSchema,
  cefrNumericFromLevel,
} from "@/lib/server/media-analysis/contracts";

// Dynamically initialized only if configured
let openaiClient: AzureOpenAI | null = null;
function getOpenAIClient(): AzureOpenAI {
  if (!openaiClient) {
    if (!env.AZURE_AI_FOUNDRY_API_KEY || !env.AZURE_AI_FOUNDRY_ENDPOINT) {
      throw new Error(
        "Azure AI Foundry credentials (AZURE_AI_FOUNDRY_API_KEY, AZURE_AI_FOUNDRY_ENDPOINT) are not configured.",
      );
    }
    openaiClient = new AzureOpenAI({
      apiKey: env.AZURE_AI_FOUNDRY_API_KEY,
      endpoint: env.AZURE_AI_FOUNDRY_ENDPOINT,
      apiVersion: "2024-05-01-preview",
      deployment: env.AZURE_AI_FOUNDRY_MODEL ?? "gpt-5-4-nano-deploy",
    });
  }
  return openaiClient;
}

type AnalyzeWithAzureFoundryInput = {
  chunkText: string;
  chunkIndex: number;
  totalChunks: number;
};

type AnalyzeWithAzureFoundryResult = {
  items: Array<
    AnalysisLlmItem & {
      cefrNumeric: number | null;
    }
  >;
  warnings: string[];
};

function buildPrompt({ chunkText, chunkIndex, totalChunks }: AnalyzeWithAzureFoundryInput) {
  return `
You are classifying reusable subtitle-analysis phrases for LexiFlix.

Only return structured JSON. Do not add prose.

Chunk ${chunkIndex + 1} of ${totalChunks}.

Extract only these reusable kinds:
- phrasal_verb
- idiom
- slang

Rules:
- Ignore single-word vocabulary. NLP owns that.
- Ignore filler and very basic expressions.
- Normalize each phrase to its canonical English form.
- Keep only items that would help an English learner studying movie or TV dialogue.
- representativeContext should be a short direct excerpt from the input chunk when possible.
- If nothing qualifies, return an empty array.

Subtitle chunk:
${chunkText}
`.trim();
}

async function runLiveAzureFoundryAnalysis(input: AnalyzeWithAzureFoundryInput) {
  const prompt = buildPrompt(input);

  logger.info("[media-analysis:llm] sending live Azure AI Foundry request", {
    chunkIndex: input.chunkIndex + 1,
    totalChunks: input.totalChunks,
    model: env.AZURE_AI_FOUNDRY_MODEL,
    chunkCharacters: input.chunkText.length,
    promptCharacters: prompt.length,
  });

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: env.AZURE_AI_FOUNDRY_MODEL ?? "gpt-5-4-nano-deploy",
    messages: [{ role: "user", content: prompt }],
    response_format: zodResponseFormat(analysisLlmResponseSchema, "analysisLlmResponse"),
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    logger.info("[media-analysis:llm] Azure AI Foundry returned empty text", {
      chunkIndex: input.chunkIndex + 1,
      totalChunks: input.totalChunks,
      model: env.AZURE_AI_FOUNDRY_MODEL,
    });

    return { items: [] };
  }

  const parsed = analysisLlmResponseSchema.parse(JSON.parse(text));

  logger.info("[media-analysis:llm] Azure AI Foundry response parsed", {
    chunkIndex: input.chunkIndex + 1,
    totalChunks: input.totalChunks,
    rawItemCount: parsed.items.length,
  });

  return parsed;
}

export async function analyzeChunkWithAzureFoundry(
  input: AnalyzeWithAzureFoundryInput,
): Promise<AnalyzeWithAzureFoundryResult> {
  logger.info("[media-analysis:llm] chunk started (Azure AI Foundry)", {
    chunkIndex: input.chunkIndex + 1,
    totalChunks: input.totalChunks,
    model: env.AZURE_AI_FOUNDRY_MODEL,
    chunkCharacters: input.chunkText.length,
  });

  const response = await runLiveAzureFoundryAnalysis(input);

  const normalized = response.items.map((item) => ({
    ...item,
    cefrNumeric: cefrNumericFromLevel(item.cefrLevel),
  }));

  const result = {
    items: normalized,
    warnings: [],
  };

  logger.info("[media-analysis:llm] chunk completed (Azure AI Foundry)", {
    chunkIndex: input.chunkIndex + 1,
    totalChunks: input.totalChunks,
    itemCount: result.items.length,
    warningCount: result.warnings.length,
  });

  return result;
}
