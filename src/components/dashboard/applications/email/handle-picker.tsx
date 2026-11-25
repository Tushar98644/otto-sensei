"use client";

import { Check, CircleAlert } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api } from "@/lib/api/client";
import { HANDLE_LIMITS, handleProblem, normalizeHandle } from "@/lib/inbound/handle";
import { cn } from "@/lib/utils";

type Check =
  | { state: "idle" | "checking" }
  | { state: "free" }
  | { state: "problem"; message: string; others: string[] };

export type HandlePickerProps = {
  initial: string;
  current?: string;
  parts: { before: string; after: string };
  submitLabel: string;
  onSubmit: (handle: string) => Promise<boolean>;
  onCancel?: () => void;
};

// The part of the address the person picks, checked as they type.
export function HandlePicker({
  initial,
  current,
  parts,
  submitLabel,
  onSubmit,
  onCancel,
}: HandlePickerProps) {
  const { handle: t } = useMessages("email");
  const inputId = useId();
  const statusId = useId();
  const [value, setValue] = useState(initial);
  const [check, setCheck] = useState<{ handle: string; result: Check }>({
    handle: "",
    result: { state: "idle" },
  });
  const [saving, setSaving] = useState(false);
  const handle = normalizeHandle(value);
  const local = handleProblem(handle);
  const same = current !== undefined && handle === current;

  useEffect(() => {
    if (!handle || local || same) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api
        .checkEmailHandle(handle, controller.signal)
        .then((answer) =>
          setCheck({
            handle,
            result: answer.available
              ? { state: "free" }
              : { state: "problem", message: answer.problem ?? "", others: answer.others },
          }),
        )
        .catch(() => {
          if (!controller.signal.aborted) setCheck({ handle, result: { state: "idle" } });
        });
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [handle, local, same]);

  // A check counts only for the handle it was made for, so a fast typist can't submit an unchecked one.
  const status: Check =
    !handle || same
      ? { state: "idle" }
      : local
        ? { state: "problem", message: fmt(t[local], HANDLE_LIMITS), others: [] }
        : check.handle === handle
          ? check.result
          : { state: "checking" };
  const ready = status.state === "free" && !saving;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setSaving(true);
    const done = await onSubmit(handle);
    setSaving(false);
    if (!done) setCheck({ handle: "", result: { state: "idle" } });
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-2.5">
      <label
        htmlFor={inputId}
        className="text-xs/4 font-medium tracking-widest text-subtle uppercase"
      >
        {t.label}
      </label>
      <div
        className={cn(
          "flex h-11 min-w-0 items-center rounded-xl border border-border-strong bg-surface font-mono text-sm transition-colors focus-within:border-ink focus-within:ring-3 focus-within:ring-ink/15",
          status.state === "problem" &&
            "border-fail focus-within:border-fail focus-within:ring-fail/15",
        )}
      >
        {parts.before ? (
          <span aria-hidden className="shrink-0 pl-3.5 text-subtle">
            {parts.before}
          </span>
        ) : null}
        <input
          id={inputId}
          value={value}
          onChange={(event) => setValue(event.target.value.toLowerCase().replace(/\s+/g, ""))}
          maxLength={HANDLE_LIMITS.max}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={status.state === "problem" || undefined}
          aria-describedby={statusId}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-hidden sm:text-sm",
            parts.before ? "pl-0.5" : "pl-3.5",
          )}
        />
        <span aria-hidden className="shrink-0 pr-3.5 text-subtle max-sm:hidden">
          {parts.after}
        </span>
      </div>
      <p
        id={statusId}
        aria-live="polite"
        className="flex min-h-5 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm/5"
      >
        {status.state === "checking" ? (
          <>
            <Spinner className="size-3.5 text-muted" />
            <span className="text-muted">{t.checking}</span>
          </>
        ) : status.state === "free" ? (
          <>
            <Check aria-hidden className="size-4 text-pass" />
            <span className="break-all text-ink">
              {parts.before}
              {handle}
              {parts.after}
            </span>
            <span className="text-muted">{t.free}</span>
          </>
        ) : status.state === "problem" ? (
          <>
            <CircleAlert aria-hidden className="size-4 text-fail" />
            <span className="text-fail-ink">{status.message}</span>
            {status.others.length > 0 ? <span className="text-muted">{t.try}</span> : null}
            {status.others.map((other) => (
              <button
                key={other}
                type="button"
                onClick={() => setValue(other)}
                className="rounded-full bg-surface-muted px-2 font-mono text-xs/6 text-ink hover:bg-surface-strong"
              >
                {other}
              </button>
            ))}
          </>
        ) : (
          <span className="text-subtle">{t.rule}</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!ready} aria-busy={saving} className="max-sm:w-full">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} className="max-sm:w-full">
            {current === undefined ? t.keepIt : fmt(t.keep, { handle: current })}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
