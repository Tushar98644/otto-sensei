"use client";

import { useId, useState, type FormEvent } from "react";
import { errorMessage } from "@/components/account/errors";
import { useMe } from "@/components/account/use-me";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { centsIn } from "@/components/account/local-prices";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { rich } from "@/i18n/rich";
import { api } from "@/lib/api/client";
import { useStudioStore } from "@/lib/store/resume-store";

export type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPro: boolean;
};

export function DeleteAccountDialog({ open, onOpenChange, isPro }: DeleteAccountDialogProps) {
  const words = useMessages("account").deleteAccount;
  const format = useFormat();
  const formId = useId();
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const confirmed = typed.trim().toLocaleUpperCase(format.locale) === words.word;
  const credit = useMe().me?.billing.credit?.balanceCents ?? 0;

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
        title: words.failed,
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
      title={words.dialogTitle}
      description={words.dialogIntro}
      footer={
        <>
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={deleting}>
            {words.cancel}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="danger"
            disabled={!confirmed}
            loading={deleting}
          >
            {words.title}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isPro ? (
          <Alert variant="warn" title={words.cancelsPlan}>
            {words.endsNow}
          </Alert>
        ) : null}
        {credit > 0 ? (
          <p className="text-sm text-muted">
            {fmt(words.credit, { credit: centsIn(format, credit) })}
          </p>
        ) : null}
        <p className="text-sm text-muted">{words.browser}</p>
        <Field
          label={rich(
            words.type,
            { b: (chunk) => <span className="font-semibold">{chunk}</span> },
            { word: words.word },
          )}
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
