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
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { cn } from "@/lib/utils";
import {
  isDefaultStyle,
  SPELLINGS,
  STYLE_LIMITS,
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
  const account = useMessages("account");
  const words = account.style;
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
      <p className="text-sm/6 text-muted">{words.intro}</p>
      <Segments
        legend={words.tone}
        options={WRITING_TONES}
        labels={words.tones}
        value={pending ? null : draft.tone}
        disabled={pending}
        onChange={(tone) => change({ tone }, 0)}
      />
      <Segments
        legend={words.length}
        options={WRITING_LENGTHS}
        labels={words.lengths}
        value={pending ? null : draft.length}
        disabled={pending}
        onChange={(length) => change({ length }, 0)}
      />
      <Segments
        legend={words.spelling}
        options={SPELLINGS}
        labels={words.spellings}
        value={pending ? null : draft.spelling}
        disabled={pending}
        onChange={(spelling) => change({ spelling }, 0)}
      />
      <Field label={words.signOff} optional hint={words.signOffHint}>
        <Input
          value={draft.signOff}
          disabled={pending}
          maxLength={STYLE_LIMITS.signOff}
          placeholder={words.signOffPlaceholder}
          autoComplete="off"
          onChange={(event) => change({ signOff: event.target.value })}
          onBlur={flush}
        />
      </Field>
      <div className="flex flex-col gap-1">
        <Field
          label={words.notes}
          optional
          hint={
            <span className="flex items-start justify-between gap-4">
              <span>{words.notesHint}</span>
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
          {notesLeft <= NOTES_WARN_AT ? fmt(words.notesLeft, { count: notesLeft }) : ""}
        </p>
      </div>
      {error ? (
        <Alert
          variant="error"
          title={words.saveFailed}
          action={
            <Button variant="secondary" onClick={() => void send(draft)}>
              {account.tryAgain}
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
          {words.reset}
        </Button>
        <SaveStatus state={state} />
      </div>
    </form>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  const words = useMessages("account").style;
  return (
    <p
      role="status"
      className="flex min-h-6 items-center gap-1.5 text-sm text-muted max-sm:justify-center"
    >
      {state === "saving" ? (
        <>
          <Spinner className="size-3.5" />
          {words.saving}
        </>
      ) : state === "saved" ? (
        <>
          <CircleCheck aria-hidden className="size-4 text-pass" />
          {words.saved}
        </>
      ) : state === "idle" ? (
        words.asYouGo
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
  labels: Readonly<Record<T, { readonly label: string; readonly hint: string }>>;
  value: T | null;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  const name = useId();
  const hintId = useId();
  return (
    <fieldset disabled={disabled} aria-describedby={hintId} className="flex min-w-0 flex-col gap-2">
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
