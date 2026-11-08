import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Shared by Input, Textarea and Select so every field looks, focuses and errors the same way.
// 16px text on phones stops iOS from zooming in on focus.
export const controlClasses =
  "w-full min-w-0 rounded-xl border border-border-strong bg-surface text-base text-ink transition-colors outline-hidden placeholder:text-subtle focus-visible:border-ink focus-visible:ring-3 focus-visible:ring-ink/15 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted aria-invalid:border-fail aria-invalid:focus-visible:ring-fail/15 sm:text-sm";

export type InputProps = ComponentProps<"input"> & {
  invalid?: boolean;
};

export function Input({
  className,
  invalid,
  type = "text",
  "aria-invalid": ariaInvalid,
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      type={type}
      aria-invalid={invalid || ariaInvalid || undefined}
      className={cn(controlClasses, "h-11 px-3.5", className)}
    />
  );
}
