import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CuratedPicksBannerProps {
  userLevel: string | null;
}

export function CuratedPicksBanner({ userLevel }: CuratedPicksBannerProps) {
  return (
    <Card className="relative overflow-hidden border border-primary/10 bg-gradient-to-r from-primary/3 via-card to-card py-0 shadow-sm">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute -right-12 -top-12 size-36 rounded-full blur-3xl opacity-15"
          style={{ background: "var(--primary)" }}
        />
      </div>
      <CardContent className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm sm:text-base">Cinematic Recommendations</h3>
              {userLevel && (
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 border-none leading-none"
                >
                  Level {userLevel}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
              {userLevel
                ? `Discover premium series and films selected specifically for your CEFR level (${userLevel}). Instantly forge personalized training decks directly from scripts.`
                : "Discover premium series and films selected specifically for your CEFR level. Instantly forge personalized training decks directly from scripts."}
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="h-8 rounded-full text-xs font-semibold shrink-0">
          <Link href="/curated">
            Browse Recommendations
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
