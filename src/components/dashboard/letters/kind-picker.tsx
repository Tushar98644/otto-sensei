"use client";

import { useMessages } from "@/i18n/client";
import type { WritingKind } from "@/lib/writings/schema";

export const WRITE_KINDS: readonly WritingKind[] = ["letter", "answer", "outreach"];

export function KindPicker({
  kind,
  disabled,
  onChange,
}: {
  kind: WritingKind;
  disabled: boolean;
  onChange: (kind: WritingKind) => void;
}) {
  const { kinds, picker } = useMessages("letters");
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div
        role="group"
        aria-label={picker}
        className="flex w-max gap-1 rounded-xl bg-surface-muted p-1"
      >
        {WRITE_KINDS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={item === kind}
            disabled={disabled}
            onClick={() => onChange(item)}
            className="flex h-9 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-muted -outline-offset-2 transition-colors hover:text-ink disabled:opacity-45 aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-control aria-pressed:ring-1 aria-pressed:ring-ink/5 pointer-coarse:h-10"
          >
            {kinds[item]}
          </button>
        ))}
      </div>
    </div>
  );
}
