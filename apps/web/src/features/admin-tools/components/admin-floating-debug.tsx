"use client";

import { AlertTriangle, Database, Loader2, RefreshCw, Shield, Trash2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  clearAnalysisStateAction,
  clearDecksAndProgressAction,
} from "@/features/admin-tools/server/actions";

type DebugAction =
  | "clear_scoped_decks"
  | "clear_scoped_analysis"
  | "clear_global_decks"
  | "clear_global_analysis";

export function AdminFloatingDebug() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [activeAction, setActiveAction] = useState<DebugAction | null>(null);
  const [mediaTitle, setMediaTitle] = useState<string | null>(null);

  // 1. Detect if we are on a media detail page
  const mediaMatch = pathname.match(/^\/media\/(\d+)/);
  const tmdbId = mediaMatch ? Number.parseInt(mediaMatch[1], 10) : null;
  const isMediaPage = tmdbId !== null;

  // Extract type & season
  const mediaType = searchParams.get("type") === "tv" ? "tv" : "movie";
  const seasonParam = searchParams.get("season");
  const seasonNumber = seasonParam ? Number.parseInt(seasonParam, 10) : null;

  // 2. Fetch page title from DOM h1 tag to display in debug options
  useEffect(() => {
    if (isMediaPage) {
      const h1 = document.querySelector("h1");
      if (h1?.textContent) {
        let title = h1.textContent.trim();
        if (mediaType === "tv" && seasonNumber) {
          if (!title.toLowerCase().includes("season")) {
            title += ` (Season ${seasonNumber})`;
          }
        }
        setMediaTitle(title);
      } else {
        setMediaTitle(
          mediaType === "tv" && seasonNumber
            ? `TV Show (ID: ${tmdbId}, Season ${seasonNumber})`
            : `Movie (ID: ${tmdbId})`,
        );
      }
    } else {
      setMediaTitle(null);
    }
  }, [isMediaPage, tmdbId, mediaType, seasonNumber]);

  const handleAction = () => {
    if (!activeAction) return;

    startTransition(async () => {
      try {
        const result =
          activeAction === "clear_scoped_decks"
            ? await clearDecksAndProgressAction({
                scope: "media",
                tmdbId: tmdbId ?? undefined,
                mediaType,
                seasonNumber,
              })
            : activeAction === "clear_scoped_analysis"
              ? await clearAnalysisStateAction({
                  scope: "media",
                  tmdbId: tmdbId ?? undefined,
                  mediaType,
                  seasonNumber,
                })
              : activeAction === "clear_global_decks"
                ? await clearDecksAndProgressAction({ scope: "global" })
                : await clearAnalysisStateAction({ scope: "global" });

        if (result?.ok) {
          toast.success(result.data.message);
          setActiveAction(null);
        } else {
          toast.error(result?.error ?? "Failed to perform action");
        }
      } catch (error) {
        console.error("Action error:", error);
        toast.error("An unexpected error occurred.");
      }
    });
  };

  const getActionDetails = () => {
    switch (activeAction) {
      case "clear_scoped_decks":
        return {
          title: `Reset Decks & Progress: ${mediaTitle || "Current Media"}`,
          description: `This will permanently delete all generated study packs, cards, and review history for "${mediaTitle || "Current Media"}". User learning statistics (streaks, global term mastery) will not be deleted. This action cannot be undone.`,
          variant: "destructive" as const,
        };
      case "clear_scoped_analysis":
        return {
          title: `Reset Content Analysis: ${mediaTitle || "Current Media"}`,
          description: `WARNING: This will permanently delete the subtitle analysis run, extracted candidate terms, events, and ALL generated study packs/progress for "${mediaTitle || "Current Media"}". The item will revert to "Not Started" / "Not Analyzed" status. This action cannot be undone.`,
          variant: "destructive" as const,
        };
      case "clear_global_decks":
        return {
          title: "CRITICAL: Global Reset of ALL Progress?",
          description:
            "WARNING: This will delete ALL study packs, cards, review events, user streaks, and user-term states in the entire database for all users. This action cannot be undone.",
          variant: "destructive" as const,
        };
      case "clear_global_analysis":
        return {
          title: "CRITICAL: Full Database System Reset?",
          description:
            "DANGER: This will permanently delete ALL content analysis runs, extracted vocabulary terms, events, items, and ALL study packs/progress globally for all users. This returns the system to a completely fresh state. This action cannot be undone.",
          variant: "destructive" as const,
        };
      default:
        return null;
    }
  };

  const details = getActionDetails();

  return (
    <>
      {/* Floating Action Button */}
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-6 right-6 h-10 w-10 rounded-full border border-amber-300/50 bg-amber-500/10 text-amber-700 shadow-md hover:bg-amber-500/20 hover:text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25 dark:hover:text-amber-300 backdrop-blur-xs transition-colors duration-200 z-50 cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500/50 outline-hidden"
          >
            <Shield className="h-4.5 w-4.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" sideOffset={8} className="w-80 p-4">
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <Database className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <div>
                <h4 className="text-sm font-semibold tracking-tight text-foreground">
                  Admin Developer Tools
                </h4>
                <p className="text-[11px] text-muted-foreground">Quick database debug mutations</p>
              </div>
            </div>

            {/* Scoped Options */}
            {isMediaPage ? (
              <div className="space-y-2 rounded-xl bg-muted/40 border border-border/50 p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500">
                  Scoped to Currently Viewing
                </div>
                <div className="text-xs font-semibold text-foreground truncate">
                  {mediaTitle || "Current Media"}
                </div>
                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[11px] justify-start h-8 px-2.5"
                    onClick={() => setActiveAction("clear_scoped_decks")}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive mr-1.5 shrink-0" />
                    Reset Decks & Progress
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[11px] justify-start h-8 px-2.5"
                    onClick={() => setActiveAction("clear_scoped_analysis")}
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500 mr-1.5 shrink-0" />
                    Reset Content Analysis
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-muted/30 border border-border/40 p-2 text-center">
                <p className="text-[11px] text-muted-foreground">
                  Navigate to a media page to perform scoped reset actions.
                </p>
              </div>
            )}

            {/* Global Options */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                Global Operations
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-[11px] justify-start h-8 px-2.5"
                  onClick={() => setActiveAction("clear_global_decks")}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive mr-1.5 shrink-0" />
                  Reset All Progress (Global)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-[11px] justify-start h-8 px-2.5"
                  onClick={() => setActiveAction("clear_global_analysis")}
                >
                  <RefreshCw className="h-3.5 w-3.5 text-destructive mr-1.5 shrink-0" />
                  Full Database Reset (Global)
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Confirmation Dialog */}
      <Dialog open={activeAction !== null} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">{details?.title}</DialogTitle>
              <DialogDescription className="text-sm mt-1.5 leading-relaxed">
                {details?.description}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" disabled={isPending} onClick={() => setActiveAction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              className="font-semibold flex items-center gap-1.5"
              onClick={handleAction}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Clearing..." : "Yes, Clear Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
