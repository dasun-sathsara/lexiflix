import { BarChart3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { MediaAnalysisSnapshot } from "@/features/media/types";
import { VOCABULARY_KIND_LABELS, VOCABULARY_KINDS } from "@/lib/domain/vocabulary";
import { cn } from "@/lib/ui/cn";
import { buildCefrDistributionEntries, getCefrColorClass } from "../lib/analysis-view";

const GENERATION_VOCABULARY_TYPES = VOCABULARY_KINDS;
const VOCABULARY_TYPE_LABELS = VOCABULARY_KIND_LABELS;

/**
 * Displays a grid of summary statistics for the media analysis.
 */
function AnalysisSummaryGrid({ snapshot }: { snapshot: MediaAnalysisSnapshot }) {
  const stats = [
    {
      label: "Extracted items",
      value: snapshot.summary?.extractedItemCount,
    },
    {
      label: "Selectable items",
      value: snapshot.summary?.selectableItemCount,
    },
    {
      label: "Subtitle lines",
      value: snapshot.summary?.subtitleLineCount,
    },
    {
      label: "Unique lemmas",
      value: snapshot.summary?.uniqueLemmaCount,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border bg-card/60 p-3">
          <div className="text-xl font-semibold">
            {typeof stat.value === "number" ? stat.value.toLocaleString() : (stat.value ?? "—")}
          </div>
          <div className="text-xs text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Renders the linguistic profile and extracted terms from a completed media analysis.
 */
export function AnalysisResults({ snapshot }: { snapshot: MediaAnalysisSnapshot }) {
  const distribution = buildCefrDistributionEntries(snapshot);
  const vocabularyCounts = Object.fromEntries(
    GENERATION_VOCABULARY_TYPES.map((kind) => [kind, snapshot.summary?.kindCounts?.[kind] ?? 0]),
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-muted-foreground" />
            Linguistic Profile
          </CardTitle>
          <CardDescription>
            Vocabulary and difficulty profile extracted from the subtitles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AnalysisSummaryGrid snapshot={snapshot} />

          {(snapshot.summary?.extractedItemCount ?? 0) > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {GENERATION_VOCABULARY_TYPES.map((kind) => (
                <div key={kind} className="rounded-xl border bg-card/60 p-3">
                  <div className="text-xl font-semibold">
                    {vocabularyCounts[kind].toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {VOCABULARY_TYPE_LABELS[kind]}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-3">
            {distribution.map((entry) => (
              <div key={entry.level} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge className={cn("border text-xs", getCefrColorClass(entry.level))}>
                    {entry.level}
                  </Badge>
                  <span className="text-sm font-medium">
                    {entry.count} term{entry.count === 1 ? "" : "s"} ({entry.percentage}%)
                  </span>
                </div>
                <Progress value={entry.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
