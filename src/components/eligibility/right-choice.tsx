"use client";

import { useId } from "react";
import { REGION_LABELS, type WorkRegion, type WorkRight } from "@/lib/eligibility/profile";
import { cn } from "@/lib/utils";

const CHOICES: Array<{ value: WorkRight | null; label: string }> = [
  { value: "authorized", label: "Yes" },
  { value: "sponsorship", label: "Need a visa" },
  { value: null, label: "Not set" },
];

// Native radios under the segmented look, so arrow keys, forms and screen readers behave as usual.
const SEGMENT = cn(
  "flex h-9 cursor-pointer items-center justify-center rounded-lg px-2 text-sm text-muted pointer-coarse:h-11",
  "hover:text-ink has-checked:bg-surface has-checked:font-medium has-checked:text-ink",
  "has-checked:shadow-control has-checked:ring-1 has-checked:ring-ink/5",
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
);

export type RightChoiceProps = {
  region: WorkRegion;
  value: WorkRight | null;
  onChange: (value: WorkRight | null) => void;
};

export function RightChoice({ region, value, onChange }: RightChoiceProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span id={`${id}-label`} className="text-sm font-medium text-ink">
        {REGION_LABELS[region]}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1 sm:w-80"
      >
        {CHOICES.map((choice) => (
          <label key={choice.label} className={SEGMENT}>
            <input
              type="radio"
              name={`${id}-right`}
              value={choice.value ?? ""}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
              className="sr-only"
            />
            {choice.label}
          </label>
        ))}
      </div>
    </div>
  );
}
