import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "neutral" | "ink" | "pass" | "warn" | "fail";

// Problems get a soft fill; passes get none, so they recede and the problems stand out.
const VARIANTS: Record<BadgeVariant, string> = {
  neutral: "bg-surface-muted text-muted",
  // The Pro plan mark.
  ink: "bg-primary text-white",
  pass: "text-muted",
  warn: "bg-warn-soft text-warn-ink",
  fail: "bg-fail-soft text-fail-ink",
};

export type BadgeProps = ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

// For check results use StatusPill, which always adds the icon and the word.
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
