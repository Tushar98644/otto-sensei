import { CircleCheck, CircleX, TriangleExclamationPoint, type LucideIcon } from "lucide-react";
import type { CheckStatus } from "@/lib/checks/types";
import { cn } from "@/lib/utils";

export type ChipTone = CheckStatus | "neutral";

export type CardChip = { label: string; tone: ChipTone; icon?: LucideIcon };

// Problems lead, passes come last and recede.
const ORDER: Record<ChipTone, number> = { fail: 0, warn: 1, neutral: 2, pass: 3 };

const LOOKS: Record<ChipTone, string> = {
  fail: "bg-fail-soft pr-2.5 pl-2 text-fail-ink",
  warn: "bg-warn-soft pr-2.5 pl-2 text-warn-ink",
  neutral: "bg-surface-muted pr-2.5 pl-2 text-muted",
  pass: "px-0.5 text-subtle",
};

const ICONS: Record<CheckStatus, LucideIcon> = {
  pass: CircleCheck,
  warn: TriangleExclamationPoint,
  fail: CircleX,
};

const ICON_COLORS: Record<ChipTone, string> = {
  fail: "text-fail",
  warn: "text-warn",
  neutral: "text-subtle",
  pass: "text-pass",
};

function Label({ text }: { text: string }) {
  const count = /^(\d[\d,]*)(\s.+)$/.exec(text);
  if (!count) return text;
  return (
    <>
      <span className="font-semibold tabular-nums">{count[1]}</span>
      {count[2]}
    </>
  );
}

export function CardChips({ chips }: { chips: readonly CardChip[] }) {
  if (chips.length === 0) return null;
  const sorted = [...chips].sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {sorted.map((chip) => {
        const Icon = chip.icon ?? (chip.tone === "neutral" ? null : ICONS[chip.tone]);
        return (
          <span
            key={chip.label}
            className={cn(
              "inline-flex h-6.5 shrink-0 items-center gap-1.5 rounded-full text-xs/4 font-medium whitespace-nowrap",
              LOOKS[chip.tone],
            )}
          >
            {Icon ? (
              <Icon aria-hidden className={cn("size-3.5 shrink-0", ICON_COLORS[chip.tone])} />
            ) : null}
            <Label text={chip.label} />
          </span>
        );
      })}
    </div>
  );
}
