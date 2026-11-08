"use client";

export type SummaryChoiceProps = {
  suggestion: string;
  current: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function SummaryChoice({ suggestion, current, checked, onChange }: SummaryChoiceProps) {
  return (
    <div className="flex flex-col gap-3">
      <blockquote className="rounded-xl bg-surface-muted p-4 text-sm leading-relaxed whitespace-pre-line text-ink">
        {suggestion}
      </blockquote>
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-ink"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-ink">Use this summary</span>
          <span className="text-sm text-muted">
            {current.trim()
              ? "Replaces your current summary in the tailored copy only."
              : "Your resume has no summary yet, so this fills the gap."}
          </span>
        </span>
      </label>
    </div>
  );
}
