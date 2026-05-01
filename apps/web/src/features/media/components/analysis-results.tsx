import { BarChart3, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { MediaAnalysisSnapshot } from "@/features/media/types";
import { cn } from "@/lib/utils";

import { buildCefrDistributionEntries, getCefrColor } from "./_utils";

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
      label: "Speech rate",
      value:
        typeof snapshot.summary?.speechRateWpm === "number"
          ? `${snapshot.summary.speechRateWpm} wpm`
          : null,
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-muted-foreground" />
            Linguistic Profile
          </CardTitle>
          <CardDescription>Real reusable analysis loaded from Postgres.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AnalysisSummaryGrid snapshot={snapshot} />

          <div className="space-y-3">
            {distribution.map((entry) => (
              <div key={entry.level} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge className={cn("border text-xs", getCefrColor(entry.level))}>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-muted-foreground" />
            Extracted Terms
          </CardTitle>
          <CardDescription>
            Top reusable vocabulary and phrase items for this title.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.items.length > 0 ? (
            <div className="space-y-3">
              {snapshot.items.map((item) => (
                <div key={item.id} className="rounded-xl border bg-card/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold tracking-tight">{item.displayText}</p>
                    <Badge variant="secondary">{item.kind.replaceAll("_", " ")}</Badge>
                    {item.cefrLevel ? (
                      <Badge className={cn("border", getCefrColor(item.cefrLevel))}>
                        {item.cefrLevel}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {item.occurrenceCount} occurrence{item.occurrenceCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  {item.representativeContext ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      “{item.representativeContext}”
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No reusable items were saved for this run.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
