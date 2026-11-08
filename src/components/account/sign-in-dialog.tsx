"use client";

import { OttoNote } from "@/components/mascot/otto-note";
import { Dialog } from "@/components/ui/dialog";
import { BRAND } from "@/config/brand";
import { ACCOUNT_OTTO } from "./copy";
import { SignInForm } from "./sign-in-form";

export type SignInDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Why we're asking, shown under the title. e.g. "Sign in to let Otto fix this line."
  reason?: string;
  onSignedIn?: () => void;
};

const DEFAULT_REASON = `A free account lets ${BRAND.mascotName} fix lines and tailor your resume.`;

// Closes itself after a successful sign-in, right after onSignedIn runs. The form only exists
// while the dialog is open, so every opening starts fresh at the email step.
export function SignInDialog({ open, onOpenChange, reason, onSignedIn }: SignInDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Sign in"
      description={reason || DEFAULT_REASON}
      illustration={<OttoNote size="sm" live={false} message={ACCOUNT_OTTO.signInDialog} />}
    >
      <SignInForm
        onSignedIn={() => {
          onSignedIn?.();
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
