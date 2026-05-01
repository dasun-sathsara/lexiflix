"use client";

import { CheckCircle2, Loader2, ShieldAlert, Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  type StatusState,
  settingsCardClass,
  settingsCardContentClass,
  settingsCardFooterClass,
  settingsCardHeaderClass,
} from "./_utils";

type DeleteAccountCardProps = {
  deleteStatus: StatusState;
  isDeletingAccount: boolean;
  handleDeleteAccount: () => void;
};

/**
 * Danger-zone card — allows the user to permanently delete their account
 * and all associated data after a confirmation dialog.
 */
export function DeleteAccountCard({
  deleteStatus,
  isDeletingAccount,
  handleDeleteAccount,
}: DeleteAccountCardProps) {
  return (
    <Card id="danger" className={`${settingsCardClass} border-destructive/40 bg-destructive/5`}>
      <CardHeader className={settingsCardHeaderClass}>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>Permanent account removal.</CardDescription>
      </CardHeader>
      <CardContent
        className={`${settingsCardContentClass} space-y-2 text-sm text-muted-foreground`}
      >
        <p>Deletes packs, progress, and billing records immediately.</p>
      </CardContent>
      <CardFooter className={settingsCardFooterClass}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {deleteStatus ? (
            <>
              {deleteStatus.type === "success" ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <ShieldAlert className="size-4 text-destructive" />
              )}
              <span
                className={
                  deleteStatus.type === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }
              >
                {deleteStatus.message}
              </span>
            </>
          ) : (
            <>
              <ShieldAlert className="size-4 text-destructive" />
              <span>Only proceed if you are sure.</span>
            </>
          )}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="px-3" disabled={isDeletingAccount}>
              {isDeletingAccount ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {isDeletingAccount ? "Deleting" : "Delete account"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is permanent. All packs, analytics, and billing records disappear
                immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingAccount}>Never mind</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                Delete anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
