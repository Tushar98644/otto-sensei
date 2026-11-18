"use client";

import { RotateCcw } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { errorMessage } from "@/components/account/errors";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { VoiceTextarea } from "@/components/ui/voice-field";
import { cn } from "@/lib/utils";
import {
  isDefaultStyle,
  LENGTH_CHOICES,
  SPELLING_CHOICES,
  SPELLINGS,
  STYLE_LIMITS,
  TONE_CHOICES,
  WRITING_LENGTHS,
  WRITING_TONES,
  type WritingStyle,
  type WritingStyleBody,
} from "@/lib/writing-style/schema";
import { bodyOf, DEFAULT_BODY, draftAfterSave, sameStyle, tidyStyle } from "./writing-style-draft";

const OPTION = cn(
  "flex cursor-pointer items-start gap-3 rounded-xl border border-border-control bg-surface p-3.5 transition-colors hover:border-border-control-hover",
  "has-checked:border-ink has-checked:bg-surface-muted has-checked:ring-1 has-checked:ring-ink",
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
  "has-disabled:cursor-default has-disabled:opacity-60 has-disabled:hover:border-border-control",
);

const NOTES_WARN_AT = 50;

export function WritingStyleForm({
  saved,
  onSave,
}: {
  saved: WritingStyle | null;
  onSave: (body: WritingStyleBody) => Promise<WritingStyle>;
}) {
  const [draft, setDraft] = useState<WritingStyleBody>(() =>
    saved ? bodyOf(saved) : DEFAULT_BODY,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = saved === null;
  const dirty = saved !== null && !sameStyle(draft, saved);
  const resetOff = pending || isDefaultStyle(draft);
  const notesLeft = STYLE_LIMITS.notes - draft.notes.length;

  function change(patch: Partial<WritingStyleBody>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    const sent = tidyStyle(draft);
    try {
      const next = await onSave(sent);
      setDraft((current) => draftAfterSave(current, sent, next));
      toast({
        title: "Writing style saved.",
        description: "Otto uses it from your next letter, answer or message.",
        variant: "success",
      });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      noValidate
      aria-busy={pending || undefined}
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-6"
    >
      <p className="text-sm/6 text-muted">
        Used for your cover letters, application answers and outreach messages. Otto follows it, but
        your work history still comes only from your resume, and Otto never makes anything up.
      </p>
      <Choices
        legend="Tone"
        options={WRITING_TONES}
        labels={TONE_CHOICES}
        value={pending ? null : draft.tone}
        disabled={pending}
        onChange={(tone) => change({ tone })}
      />
      <Choices
        legend="Length"
        options={WRITING_LENGTHS}
        labels={LENGTH_CHOICES}
        value={pending ? null : draft.length}
        disabled={pending}
        onChange={(length) => change({ length })}
      />
      <Choices
        legend="Spelling"
        options={SPELLINGS}
        labels={SPELLING_CHOICES}
        value={pending ? null : draft.spelling}
        disabled={pending}
        onChange={(spelling) => change({ spelling })}
      />
      <Field label="Sign-off" optional hint="Ends your cover letters and messages.">
        <Input
          value={draft.signOff}
          disabled={pending}
          maxLength={STYLE_LIMITS.signOff}
          placeholder="Best regards"
          autoComplete="off"
          onChange={(event) => change({ signOff: event.target.value })}
        />
      </Field>
      <div className="flex flex-col gap-1">
        <Field
          label="Notes for Otto"
          optional
          hint={
            <span className="flex items-start justify-between gap-4">
              <span>
                Anything else to keep in mind, such as &ldquo;Mention I&apos;m open to
                relocating&rdquo; or &ldquo;Keep it modest, no superlatives.&rdquo;
              </span>
              <span aria-hidden className="shrink-0 tabular-nums">
                {draft.notes.length}/{STYLE_LIMITS.notes}
              </span>
            </span>
          }
        >
          <VoiceTextarea
            value={draft.notes}
            disabled={pending}
            rows={3}
            maxLength={STYLE_LIMITS.notes}
            onChange={(event) => change({ notes: event.target.value })}
            onDictate={(notes) => change({ notes })}
          />
        </Field>
        <p className="sr-only" aria-live="polite">
          {notesLeft <= NOTES_WARN_AT ? `${notesLeft} characters left in your notes.` : ""}
        </p>
      </div>
      {error ? (
        <Alert
          variant="error"
          title="Couldn't save your writing style"
          action={
            <Button type="submit" variant="secondary">
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={!dirty} loading={saving} className="w-full sm:w-auto">
          Save style
        </Button>
        <Button
          variant="ghost"
          aria-disabled={resetOff}
          onClick={() => {
            if (!resetOff) change(DEFAULT_BODY);
          }}
          className="w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:bg-transparent sm:w-auto"
        >
          <RotateCcw />
          Reset to default
        </Button>
        {dirty ? <p className="text-sm text-muted max-sm:text-center">Unsaved changes</p> : null}
      </div>
    </form>
  );
}

function Choices<T extends string>({
  legend,
  options,
  labels,
  value,
  disabled,
  onChange,
}: {
  legend: string;
  options: readonly T[];
  labels: Record<T, { label: string; hint: string }>;
  value: T | null;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option} className={OPTION}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="mt-0.5 size-4 shrink-0 accent-ink focus-visible:outline-none"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium text-ink">{labels[option].label}</span>
              <span className="text-sm text-muted">{labels[option].hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
