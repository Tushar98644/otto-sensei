"use client";

import { OttoNote } from "@/components/mascot/otto-note";
import { Dialog } from "@/components/ui/dialog";
import { BRAND } from "@/config/brand";
import { ACCOUNT_OTTO } from "./copy";
import { SignInForm } from "./sign-in-form";

export type SignInDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
  onSignedIn?: () => void;
  onGoogleRedirect?: () => void;
};

const DEFAULT_REASON = `A free account lets ${BRAND.mascotName} fix lines and tailor your resume.`;

export function SignInDialog({
  open,
  onOpenChange,
  reason,
  onSignedIn,
  onGoogleRedirect,
}: SignInDialogProps) {
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
        onGoogleRedirect={onGoogleRedirect}
        onSignedIn={() => {
          onSignedIn?.();
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
