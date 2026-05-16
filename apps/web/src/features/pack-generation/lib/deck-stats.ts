export interface GenerationStats {
  active: number;
  completed: number;
  failed: number;
  total: number;
}
export function computeGenerationStats(jobs: { status: string }[]): GenerationStats {
  return {
    active: jobs.filter((j) => j.status === "queued" || j.status === "running").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
    total: jobs.length,
  };
}
