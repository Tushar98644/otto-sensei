"use client";

import { useId } from "react";

export type ShareOptionValues = { showContact: boolean; allowIndexing: boolean };

export const DEFAULT_SHARE_OPTIONS: ShareOptionValues = {
  showContact: false,
  allowIndexing: false,
};

export type ShareOptionsCopy = {
  legend: string;
  contact: string;
  contactHint: string;
  indexing: string;
  indexingHint: string;
};

// The share dialog in the studio and dashboard has no share messages yet, so it reads these.
const englishCopy: ShareOptionsCopy = {
  legend: "What the page shows",
  contact: "Show email and phone",
  contactHint: "Off: the page and its PDF leave them out. Your name, city and links always show.",
  indexing: "Let search engines list it",
  indexingHint: "Off: Google and others are asked to keep it out of search results.",
};

type ShareOptionsProps = {
  value: ShareOptionValues;
  onChange: (patch: Partial<ShareOptionValues>) => void;
  disabled?: boolean;
  copy?: ShareOptionsCopy;
};

export function ShareOptions({
  value,
  onChange,
  disabled = false,
  copy = englishCopy,
}: ShareOptionsProps) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="sr-only">{copy.legend}</legend>
      <div className="divide-y divide-border border-y border-border">
        <Option
          checked={value.showContact}
          onChange={(checked) => onChange({ showContact: checked })}
          label={copy.contact}
          hint={copy.contactHint}
        />
        <Option
          checked={value.allowIndexing}
          onChange={(checked) => onChange({ allowIndexing: checked })}
          label={copy.indexing}
          hint={copy.indexingHint}
        />
      </div>
    </fieldset>
  );
}

type OptionProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
};

function Option({ checked, onChange, label, hint }: OptionProps) {
  const hintId = useId();
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-3 has-disabled:cursor-default">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        aria-describedby={hintId}
        className="mt-1 size-4 shrink-0 accent-ink"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm/6 font-medium text-ink">{label}</span>
        <span id={hintId} className="text-sm/5 text-muted">
          {hint}
        </span>
      </span>
    </label>
  );
}
