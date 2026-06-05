"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { setUserGenerationLimitAction } from "@/features/admin-users/server/actions";

const generationLimitSchema = z.object({
  limit: z.string().refine(
    (val) => {
      const trimmed = val.trim();
      if (trimmed === "") return true;
      const num = Number(trimmed);
      return Number.isInteger(num) && num >= 0;
    },
    { message: "Enter a whole number of zero or more, or leave blank for unlimited." },
  ),
});

type AdminUserLimitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentLimit: number | null;
  generationCount: number;
};

export function AdminUserLimitDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentLimit,
  generationCount,
}: AdminUserLimitDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ limit: string }>({
    resolver: zodResolver(generationLimitSchema),
    defaultValues: {
      limit: currentLimit?.toString() ?? "",
    },
  });

  const onSubmit = (data: { limit: string }) => {
    const trimmed = data.limit.trim();
    const parsedLimit = trimmed === "" ? null : Number(trimmed);

    startTransition(async () => {
      try {
        const result = await setUserGenerationLimitAction({
          userId,
          generationLimit: parsedLimit,
        });

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        onOpenChange(false);
        toast.success("Generation limit updated");
        router.refresh();
      } catch {
        toast.error("Could not update the generation limit.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Generation limit</DialogTitle>
            <DialogDescription>
              Set the lifetime allowance for {userName}. Leave blank for unlimited access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Current usage</span>
                <span className="font-medium tabular-nums">
                  {generationCount.toLocaleString()} generations
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`generation-limit-${userId}`} className="text-sm font-medium">
                Lifetime limit
              </label>
              <Input
                id={`generation-limit-${userId}`}
                type="number"
                min={0}
                max={1_000_000}
                inputMode="numeric"
                placeholder="Unlimited"
                className="tabular-nums"
                disabled={isPending}
                aria-invalid={!!errors.limit}
                {...register("limit")}
              />
              {errors.limit ? (
                <p className="text-xs text-destructive">{errors.limit.message}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Set to zero to block new generations. Existing packs are unaffected.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Save limit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
