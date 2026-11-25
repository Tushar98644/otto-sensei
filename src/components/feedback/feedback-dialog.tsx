"use client";

import { useId, useState, type FormEvent } from "react";
import { errorMessage } from "@/components/account/errors";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import { FEEDBACK_KINDS, FEEDBACK_LIMITS, type FeedbackKind } from "@/lib/feedback/types";
import { useMessagesOr } from "@/i18n/client";
import EN_APP from "@/i18n/messages/en/app";
import EN_UI from "@/i18n/messages/en/ui";

export type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const t = useMessagesOr("ui", EN_UI).feedback;
  const app = useMessagesOr("app", EN_APP);
  const formId = useId();
  const kindName = useId();
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (text.length < FEEDBACK_LIMITS.minChars) {
      setError(t.tooShort);
      return;
    }
    setSending(true);
    setError(null);
    try {
      // The path only: a query string can hold ids that say more than the page does.
      await api.feedback({ kind, message: text, pagePath: window.location.pathname });
      setMessage("");
      onOpenChange(false);
      toast({ title: t.sent, variant: "success" });
    } catch (failure) {
      setError(errorMessage(failure, app.errors));
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={t.title}
      description={t.description}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button type="submit" form={formId} loading={sending}>
            {t.send}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-ink">{t.about}</legend>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1">
            {FEEDBACK_KINDS.map((value) => (
              <label key={value} className="relative min-w-0">
                <input
                  type="radio"
                  name={kindName}
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                  className="peer sr-only"
                />
                <span className="flex h-11 cursor-pointer items-center justify-center rounded-lg px-2 text-center text-sm font-medium text-muted transition-colors peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-control peer-checked:ring-1 peer-checked:ring-ink/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink hover:text-ink">
                  {t.kinds[value]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={t.note} error={error}>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t.placeholders[kind]}
            maxLength={FEEDBACK_LIMITS.maxChars}
            rows={5}
            data-autofocus
          />
        </Field>
      </form>
    </Dialog>
  );
}
