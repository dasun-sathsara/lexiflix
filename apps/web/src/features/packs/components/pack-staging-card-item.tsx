import { BookOpen, Check, Clock, Eye, RotateCcw, Sparkles, Trash2, Volume2 } from "lucide-react";
import Link from "next/link";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PackCardView } from "@/features/packs/types";
import { cn } from "@/lib/utils";

import { cefrBadgeClass } from "./_utils";

export type PackStagingCardItemProps = {
  item: PackCardView;
  packId: string;
  isSelected: boolean;
  isSelectionMode: boolean;
  pendingAction: boolean;
  onToggleSelect: (id: string) => void;
  onRemoveCard: (id: string) => void;
  onRunItemAction: (action: () => Promise<{ ok: true } | { ok: false; error: string }>) => void;
  onRestore: () => Promise<{ ok: true } | { ok: false; error: string }>;
  onReset: () => Promise<{ ok: true } | { ok: false; error: string }>;
  onMarkKnown: () => Promise<{ ok: true } | { ok: false; error: string }>;
  onMarkLearning: () => Promise<{ ok: true } | { ok: false; error: string }>;
  onIgnore: () => Promise<{ ok: true } | { ok: false; error: string }>;
};

function statusBadgeClass(status: PackCardView["state"]) {
  switch (status) {
    case "new":
      return "bg-indigo-500/10 text-indigo-700 border-indigo-200/60 dark:text-indigo-300 dark:border-indigo-500/20";
    case "learning":
      return "bg-amber-500/10 text-amber-700 border-amber-200/60 dark:text-amber-300 dark:border-amber-500/20";
    case "due":
      return "bg-rose-500/10 text-rose-700 border-rose-200/60 dark:text-rose-300 dark:border-rose-500/20";
    case "mastered":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:text-emerald-300 dark:border-emerald-500/20";
    case "removed":
      return "bg-muted text-muted-foreground border-border";
  }
}

function statusIcon(status: PackCardView["state"]) {
  switch (status) {
    case "new":
      return <Sparkles className="size-3" />;
    case "learning":
      return <RotateCcw className="size-3" />;
    case "due":
      return <Clock className="size-3" />;
    case "mastered":
      return <Check className="size-3" />;
    case "removed":
      return <Trash2 className="size-3" />;
  }
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function truncate(text: string | null, max = 180) {
  if (!text) {
    return "No generated meaning was saved for this card.";
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}...`;
}

/**
 * Renders an individual flashcard item in the staging list, including its current state
 * and action buttons for manual overrides.
 */
export function PackStagingCardItem({
  item,
  packId,
  isSelected,
  isSelectionMode,
  pendingAction,
  onToggleSelect,
  onRemoveCard,
  onRunItemAction,
  onRestore,
  onReset,
  onMarkKnown,
  onMarkLearning,
  onIgnore,
}: PackStagingCardItemProps) {
  const firstExample = item.exampleSentences[0] ?? null;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all",
        isSelected && "ring-2 ring-primary ring-offset-2",
      )}
    >
      <CardContent className="px-4 ">
        <div className="flex gap-4">
          {isSelectionMode ? (
            <div className="flex items-start pt-1">
              <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(item.id)} />
            </div>
          ) : null}

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg tracking-tight">{item.displayText}</span>
              <Badge variant="secondary">{label(item.kind)}</Badge>
              {item.partOfSpeech ? <Badge variant="outline">{item.partOfSpeech}</Badge> : null}
              <Badge className={`border ${cefrBadgeClass(item.cefrLevel)}`}>
                {item.cefrLevel ?? "CEFR n/a"}
              </Badge>
              <Badge className={`gap-1 border ${statusBadgeClass(item.state)}`}>
                {statusIcon(item.state)}
                {label(item.state)}
              </Badge>
              {item.audioUrl ? (
                <Badge variant="outline" className="gap-1">
                  <Volume2 className="size-3" />
                  Audio
                </Badge>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-foreground/86">{truncate(item.meaning)}</p>
              {firstExample ? (
                <p className="text-sm italic text-foreground/60">&quot;{firstExample}&quot;</p>
              ) : null}
            </div>
          </div>

          {!isSelectionMode ? (
            <div className="flex shrink-0 items-start gap-1">
              {item.state !== "removed" ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <Link
                        href={`/study/${packId}?mode=preview&card=${item.id}`}
                        aria-label={`Preview ${item.displayText}`}
                      >
                        <Eye className="size-4" />
                        <span className="sr-only">Preview {item.displayText}</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Preview card</TooltipContent>
                </Tooltip>
              ) : null}
              {item.state === "removed" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  disabled={pendingAction}
                  onClick={() => onRunItemAction(onRestore)}
                  aria-label={`Restore ${item.displayText}`}
                  title="Restore card"
                >
                  <RotateCcw className="size-4" />
                  <span className="sr-only">Restore {item.displayText}</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  disabled={pendingAction}
                  onClick={() => onRunItemAction(onReset)}
                  aria-label={`Reset ${item.displayText}`}
                  title="Reset card"
                >
                  <RotateCcw className="size-4" />
                  <span className="sr-only">Reset {item.displayText}</span>
                </Button>
              )}
              {item.state !== "removed" ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-emerald-600"
                    disabled={pendingAction}
                    onClick={() => onRunItemAction(onMarkKnown)}
                    aria-label={`Mark ${item.displayText} known`}
                    title="Mark term known"
                  >
                    <Check className="size-4" />
                    <span className="sr-only">Mark {item.displayText} known</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-amber-600"
                    disabled={pendingAction}
                    onClick={() => onRunItemAction(onMarkLearning)}
                    aria-label={`Mark ${item.displayText} learning`}
                    title="Mark term learning"
                  >
                    <BookOpen className="size-4" />
                    <span className="sr-only">Mark {item.displayText} learning</span>
                  </Button>
                </>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                disabled={pendingAction}
                onClick={() => onRunItemAction(onIgnore)}
                aria-label={
                  item.state === "removed"
                    ? `Unignore ${item.displayText}`
                    : `Ignore ${item.displayText}`
                }
                title={item.state === "removed" ? "Unignore term" : "Ignore term"}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">
                  {item.state === "removed" ? "Unignore" : "Ignore"} {item.displayText}
                </span>
              </Button>
              {item.state !== "removed" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      disabled={pendingAction}
                      aria-label={`Remove ${item.displayText}`}
                      title="Remove card"
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Remove {item.displayText}</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove &quot;{item.displayText}&quot;?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the card from this pack only. It does not mark the term known
                        or ignored.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onRemoveCard(item.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
