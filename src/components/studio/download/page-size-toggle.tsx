"use client";

import { useId } from "react";
import { PAGE_SIZE_LABELS, PDF_PAGE_SIZES, type PdfPageSize } from "@/lib/pdf/page-size";
import { cn } from "@/lib/utils";

export type PageSizeToggleProps = {
  value: PdfPageSize;
  onChange: (size: PdfPageSize) => void;
  className?: string;
};

// Native radios: arrow keys, focus and screen-reader announcements work without extra code.
export function PageSizeToggle({ value, onChange, className }: PageSizeToggleProps) {
  const name = useId();
  const hintId = `${name}-hint`;
  return (
    <fieldset className={cn("flex flex-col gap-1.5", className)} aria-describedby={hintId}>
      <legend className="mb-1.5 text-sm font-medium text-ink">Page size</legend>
      <div className="inline-flex w-fit gap-1 rounded-xl bg-surface-muted p-1">
        {PDF_PAGE_SIZES.map((size) => (
          <label key={size} className="relative">
            <input
              type="radio"
              name={name}
              value={size}
              checked={value === size}
              onChange={() => onChange(size)}
              className="peer sr-only"
            />
            <span className="flex h-11 min-w-20 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-medium text-muted transition-colors peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-control peer-checked:ring-1 peer-checked:ring-ink/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink hover:text-ink">
              {PAGE_SIZE_LABELS[size]}
            </span>
          </label>
        ))}
      </div>
      <p id={hintId} className="text-sm text-muted">
        Letter for the US and Canada, A4 almost everywhere else.
      </p>
    </fieldset>
  );
}
