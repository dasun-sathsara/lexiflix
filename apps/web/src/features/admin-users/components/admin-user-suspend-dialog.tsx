"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { setUserSuspendedAction } from "@/features/admin-users/server/actions";

type AdminUserSuspendDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
};

export function AdminUserSuspendDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: AdminUserSuspendDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");

  function handleSuspend() {
    startTransition(async () => {
      try {
        const result = await setUserSuspendedAction({
          userId,
          suspended: true,
          reason: reason.trim() || undefined,
        });

        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        onOpenChange(false);
        setReason("");
        toast.success("Account disabled");
        router.refresh();
      } catch {
        toast.error("Could not update this account.");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disable {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Active sessions will be revoked and new sign-ins blocked. Learning data is preserved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <label htmlFor={`suspension-reason-${userId}`} className="text-sm font-medium">
            Reason (optional)
          </label>
          <Textarea
            id={`suspension-reason-${userId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={200}
            placeholder="Add an internal note"
            className="min-h-16"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSuspend}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Disable account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
