"use client";

import { useId, useState, type FormEvent } from "react";
import { errorMessage } from "@/components/account/errors";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import { useStudioStore } from "@/lib/store/resume-store";

const CONFIRM_WORD = "DELETE";

export type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPro: boolean;
};

export function DeleteAccountDialog({ open, onOpenChange, isPro }: DeleteAccountDialogProps) {
  const formId = useId();
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;

  function handleOpenChange(next: boolean) {
    if (deleting) return;
    if (!next) setTyped("");
    onOpenChange(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed || deleting) return;
    setDeleting(true);
    try {
      await api.deleteAccount();
    } catch (error) {
      setDeleting(false);
      toast({
        title: "Couldn't delete your account",
        description: errorMessage(error),
        variant: "error",
      });
      return;
    }
    clearLocalStudio();
    // Full page load so no in-memory copy of the account survives; replace so Back can't return.
    window.location.replace("/");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      size="sm"
      title="Delete your account?"
      description="This deletes your account, the resumes backed up to it, and your usage history. You can't undo it."
      footer={
        <>
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="danger"
            disabled={!confirmed}
            loading={deleting}
          >
            Delete account
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isPro ? (
          <Alert variant="warn" title="This also cancels your plan">
            Your paid plan ends right away, and you won&apos;t be charged again.
          </Alert>
        ) : null}
        <p className="text-sm text-muted">Resumes saved in this browser are cleared too.</p>
        <Field
          label={
            <>
              Type <span className="font-semibold">{CONFIRM_WORD}</span> to confirm
            </>
          }
        >
          <Input
            value={typed}
            onChange={(event) => setTyped(event.currentTarget.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={32}
            enterKeyHint="done"
            data-autofocus
          />
        </Field>
      </form>
    </Dialog>
  );
}

function clearLocalStudio() {
  try {
    useStudioStore.getState().clearAll();
    // clearAll() leaves an empty studio saved; this also drops the key and any hydration in flight.
    useStudioStore.persist.clearStorage();
  } catch {}
}
