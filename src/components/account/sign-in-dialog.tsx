"use client";

import { OttoNote } from "@/components/mascot/otto-note";
import { Dialog } from "@/components/ui/dialog";
import { SignInForm } from "./sign-in-form";
import { useSignInWords } from "./use-sign-in-words";

export type SignInDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
  onSignedIn?: () => void;
  onGoogleRedirect?: () => void;
};

export function SignInDialog({
  open,
  onOpenChange,
  reason,
  onSignedIn,
  onGoogleRedirect,
}: SignInDialogProps) {
  const t = useSignInWords();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={t.signIn}
      description={reason || t.dialog.reason}
      illustration={<OttoNote size="sm" live={false} message={t.dialog.otto} />}
    >
      <SignInForm
        onGoogleRedirect={onGoogleRedirect}
        onSignedIn={() => {
          onSignedIn?.();
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
