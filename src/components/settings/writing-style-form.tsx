"use client";

import { CircleCheck, RotateCcw } from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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

const SEGMENT = cn(
  "flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg px-3 text-sm whitespace-nowrap text-muted pointer-coarse:h-11 sm:flex-none",
  "hover:text-ink has-checked:bg-surface has-checked:font-medium has-checked:text-ink",
  "has-checked:shadow-control has-checked:ring-1 has-checked:ring-ink/5",
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
  "has-disabled:cursor-default has-disabled:opacity-60 has-disabled:hover:text-muted",
);

const NOTES_WARN_AT = 50;
// Picks save at once; typing waits for a pause, and leaving the field or the page sends it straight away.
const TYPING_PAUSE_MS = 800;

type SaveState = "idle" | "saving" | "saved" | "error";

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
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const held = useRef<WritingStyleBody | null>(saved ? bodyOf(saved) : null);
  const waiting = useRef<{ body: WritingStyleBody; timer: number } | null>(null);
  const sending = useRef(false);
  const queued = useRef<WritingStyleBody | null>(null);
  const pending = saved === null;
  const resetOff = pending || isDefaultStyle(draft);
  const notesLeft = STYLE_LIMITS.notes - draft.notes.length;

  async function send(body: WritingStyleBody) {
    if (sending.current) {
      queued.current = body;
      return;
    }
    if (held.current && sameStyle(body, held.current)) {
      setState((current) => (current === "saving" ? "saved" : current));
      return;
    }
    sending.current = true;
    setState("saving");
    setError(null);
    const sent = tidyStyle(body);
    try {
      const next = await onSave(sent);
      held.current = bodyOf(next);
      setDraft((current) => draftAfterSave(current, sent, next));
      setState("saved");
    } catch (caught) {
      setError(errorMessage(caught));
      setState("error");
    } finally {
      sending.current = false;
    }
    const later = queued.current;
    queued.current = null;
    if (later) await send(later);
  }

  function flush() {
    const next = waiting.current;
    if (!next) return;
    window.clearTimeout(next.timer);
    waiting.current = null;
    void send(next.body);
  }

  function change(patch: Partial<WritingStyleBody>, pause = TYPING_PAUSE_MS) {
    const body = { ...draft, ...patch };
    setDraft(body);
    setState("saving");
    if (waiting.current) window.clearTimeout(waiting.current.timer);
    waiting.current = {
      body,
      timer: window.setTimeout(() => {
        waiting.current = null;
        void send(body);
      }, pause),
    };
  }

  const flushNow = useEffectEvent(flush);
  useEffect(() => {
    const onHide = () => flushNow();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      flushNow();
    };
  }, []);

  return (
    <form
      noValidate
      aria-busy={pending || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        flush();
      }}
      className="flex flex-col gap-6"
    >
      <p className="max-w-prose text-sm/6 text-pretty text-muted">
        Used for your cover letters, application answers and outreach messages. Your work history
        still comes only from your resume, and Otto never makes anything up.
      </p>
      <Segments
        legend="Tone"
        options={WRITING_TONES}
        labels={TONE_CHOICES}
        value={pending ? null : draft.tone}
        disabled={pending}
        onChange={(tone) => change({ tone }, 0)}
      />
      <Segments
        legend="Length"
        options={WRITING_LENGTHS}
        labels={LENGTH_CHOICES}
        value={pending ? null : draft.length}
        disabled={pending}
        onChange={(length) => change({ length }, 0)}
      />
      <Segments
        legend="Spelling"
        options={SPELLINGS}
        labels={SPELLING_CHOICES}
        value={pending ? null : draft.spelling}
        disabled={pending}
        onChange={(spelling) => change({ spelling }, 0)}
      />
      <Field
        label="Sign-off"
        optional
        hint="Ends your cover letters and messages."
        className="sm:max-w-sm"
      >
        <Input
          value={draft.signOff}
          disabled={pending}
          maxLength={STYLE_LIMITS.signOff}
          placeholder="Best regards"
          autoComplete="off"
          onChange={(event) => change({ signOff: event.target.value })}
          onBlur={flush}
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
            onDictate={(notes) => change({ notes }, 0)}
            onBlur={flush}
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
            <Button variant="secondary" onClick={() => void send(draft)}>
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          aria-disabled={resetOff}
          onClick={() => {
            if (!resetOff) change(DEFAULT_BODY, 0);
          }}
          className="w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:bg-transparent sm:-ml-4 sm:w-auto"
        >
          <RotateCcw />
          Reset to default
        </Button>
        <SaveStatus state={state} />
      </div>
    </form>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  return (
    <p
      role="status"
      className="flex min-h-6 items-center gap-1.5 text-sm text-muted max-sm:justify-center"
    >
      {state === "saving" ? (
        <>
          <Spinner className="size-3.5" />
          Saving…
        </>
      ) : state === "saved" ? (
        <>
          <CircleCheck aria-hidden className="size-4 text-pass" />
          Saved
        </>
      ) : state === "idle" ? (
        "Changes save as you go."
      ) : null}
    </p>
  );
}

function Segments<T extends string>({
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
  const hintId = useId();
  return (
    <fieldset
      disabled={disabled}
      aria-describedby={hintId}
      className="flex min-w-0 flex-col gap-2"
    >
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex w-full gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1 sm:w-fit">
        {options.map((option) => (
          <label key={option} className={SEGMENT}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {labels[option].label}
          </label>
        ))}
      </div>
      <p id={hintId} className="min-h-6 text-sm text-muted">
        {value ? labels[value].hint : null}
      </p>
    </fieldset>
  );
}
