import { task } from "@trigger.dev/sdk";
import { z } from "zod";
import { runPackGenerationWorkflow } from "@/lib/server/content-generation/workflow";

const generateContentPackPayloadSchema = z.object({
  jobId: z.string().min(1),
});

export type GenerateContentPackPayload = z.infer<typeof generateContentPackPayloadSchema>;

export const generateContentPackTask = task({
  id: "generate-content-pack",
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: GenerateContentPackPayload) => {
    const parsed = generateContentPackPayloadSchema.parse(payload);
    return runPackGenerationWorkflow(parsed.jobId);
  },
});
