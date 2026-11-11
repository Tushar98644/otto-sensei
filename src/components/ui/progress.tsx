import { useId } from "react";
import { cn } from "@/lib/utils";

export type ProgressTone = "ink" | "pass" | "warn" | "fail";

const TONES: Record<ProgressTone, string> = {
  ink: "bg-primary",
  pass: "bg-pass",
  warn: "bg-warn",
  fail: "bg-fail",
};

export type ProgressProps = {
  value: number;
  max?: number;
  // What is being measured, e.g. "Line fixes this month". Always read to screen readers.
  label: string;
  // Shown on the right and read instead of a bare percentage, e.g. "12 of 20 used".
  valueText?: string;
  hideLabel?: boolean;
  tone?: ProgressTone;
  size?: "sm" | "md";
  className?: string;
};

export function Progress({
  value,
  max = 100,
  label,
  valueText,
  hideLabel = false,
  tone = "ink",
  size = "md",
  className,
}: ProgressProps) {
  const small = size === "sm";
  const labelId = useId();
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const current = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0;
  const percent = (current / safeMax) * 100;

  return (
    <div className={cn("flex flex-col", small ? "gap-1" : "gap-1.5", className)}>
      {hideLabel ? null : (
        <div
          className={cn(
            "flex items-baseline justify-between gap-3",
            small ? "text-xs/5" : "text-sm",
          )}
        >
          <span id={labelId} className="font-medium text-ink">
            {label}
          </span>
          {valueText ? <span className="text-muted tabular-nums">{valueText}</span> : null}
        </div>
      )}
      <div
        role="progressbar"
        aria-labelledby={hideLabel ? undefined : labelId}
        aria-label={hideLabel ? label : undefined}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={current}
        aria-valuetext={valueText}
        className={cn(
          "w-full overflow-hidden rounded-full bg-surface-strong",
          small ? "h-1.5" : "h-2",
        )}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", TONES[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
