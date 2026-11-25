"use client";

import { fmt } from "@/i18n/format";
import { useMessages } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { PrepMessages } from "../../i18n";

export function practiceLine(got: number, total: number, { meter }: PrepMessages): string {
  const done = Math.min(got, total);
  if (done === 0) return meter.none;
  return done === total ? meter.all : fmt(meter.some, { done, total });
}

export function PracticeMeter({
  got,
  total,
  className,
  barClassName = "w-20",
}: {
  got: number;
  total: number;
  className?: string;
  barClassName?: string;
}) {
  const t = useMessages("prep");
  const fraction = total > 0 ? Math.min(got, total) / total : 0;
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn("h-1.5 overflow-hidden rounded-full bg-surface-strong", barClassName)}
      >
        <span
          className="block h-full origin-left rounded-full bg-primary transition-transform duration-500 ease-out"
          style={{ transform: `scaleX(${fraction})` }}
        />
      </span>
      <span className="text-xs/5 text-muted tabular-nums">{practiceLine(got, total, t)}</span>
    </div>
  );
}
