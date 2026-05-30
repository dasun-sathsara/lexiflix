import { task } from "@trigger.dev/sdk";
import { z } from "zod";

import { runMediaAnalysisWorkflow } from "@/lib/server/media-analysis/workflow";

const analyzeMediaSubtitlesPayloadSchema = z.object({
  runId: z.string().min(1),
});

export type AnalyzeMediaSubtitlesPayload = z.infer<typeof analyzeMediaSubtitlesPayloadSchema>;

export const analyzeMediaSubtitlesTask = task({
  id: "analyze-media-subtitles",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 15000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: AnalyzeMediaSubtitlesPayload) => {
    const parsed = analyzeMediaSubtitlesPayloadSchema.parse(payload);
    return runMediaAnalysisWorkflow(parsed.runId);
  },
});
