import type { PlanTone } from "../types";

export function clampToInt(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export const planToneDot: Record<PlanTone, string> = {
  default: "bg-muted-foreground/45",
  accent: "bg-blue-500",
  warm: "bg-amber-500",
  danger: "bg-rose-500",
};
