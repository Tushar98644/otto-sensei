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

// A titled group in the editor panel. The panel itself is the white card, so a group is only a
// heading, an optional line under it and its controls; the panel splits groups with hairlines.
export function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-sans text-base/6 font-semibold text-ink">{title}</h2>
        {description ? <p className="text-sm/6 text-pretty text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
