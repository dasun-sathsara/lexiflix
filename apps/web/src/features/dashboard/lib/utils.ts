export { clampToInt } from "@/lib/primitives/numbers";

import type { PlanTone } from "../types";

export const planToneDot: Record<PlanTone, string> = {
  default: "bg-muted-foreground/45",
  accent: "bg-blue-500",
  warm: "bg-amber-500",
  danger: "bg-rose-500",
};
