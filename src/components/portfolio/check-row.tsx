"use client";

import { useId, type ReactNode } from "react";

type CheckRowProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
};

// One switch in a row list, the share dialog's look: label, a muted hint, 44px tall.
export function CheckRow({ checked, onChange, label, hint, disabled = false }: CheckRowProps) {
  const hintId = useId();
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-3 has-disabled:cursor-default">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
        aria-describedby={hint ? hintId : undefined}
        className="mt-1 size-4 shrink-0 accent-ink"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm/6 font-medium text-ink">{label}</span>
        {hint ? (
          <span id={hintId} className="text-sm/5 text-muted">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function EditorCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-4 sm:p-6">
      <h2 className="font-sans text-base/6 font-semibold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
