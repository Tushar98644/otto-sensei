import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "neutral" | "ink" | "pass" | "warn" | "fail";

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: "bg-surface-muted text-muted",
  ink: "bg-primary text-white",
  pass: "text-muted",
  warn: "bg-warn-soft text-warn-ink",
  fail: "bg-fail-soft text-fail-ink",
};

export type BadgeProps = ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        VARIANTS[variant],
        className,
      )}
    />
  );
}
