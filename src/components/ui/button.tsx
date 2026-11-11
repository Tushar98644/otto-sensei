import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

export type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

const BASE =
  "relative inline-flex shrink-0 items-center justify-center border font-medium whitespace-nowrap transition duration-150 ease-out select-none disabled:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-lg px-3 text-sm pointer-coarse:h-11",
  md: "h-11 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-5 text-base [&_svg:not([class*='size-'])]:size-5",
  icon: "size-11 rounded-xl",
  "icon-sm": "size-9 rounded-lg pointer-coarse:size-11",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border-primary-edge bg-primary bg-linear-to-b from-primary-top to-primary text-white shadow-key inset-shadow-key hover:from-primary-hover-top hover:to-primary-hover active:translate-y-px active:from-primary active:to-primary active:shadow-none active:inset-shadow-pressed disabled:not-aria-busy:border-transparent disabled:not-aria-busy:bg-none disabled:not-aria-busy:bg-surface-strong disabled:not-aria-busy:text-muted disabled:not-aria-busy:shadow-none disabled:not-aria-busy:inset-shadow-none",
  secondary:
    "border-border-control bg-surface text-ink shadow-control hover:border-border-control-hover hover:bg-surface-hover active:translate-y-px active:bg-surface-muted active:shadow-none disabled:not-aria-busy:border-border disabled:not-aria-busy:bg-transparent disabled:not-aria-busy:text-muted disabled:not-aria-busy:shadow-none",
  ghost:
    "border-transparent text-ink hover:bg-ink/6 active:bg-ink/10 aria-expanded:bg-ink/6 disabled:not-aria-busy:opacity-45",
  danger:
    "border-fail-ink bg-fail bg-linear-to-b from-fail-top to-fail text-white shadow-key inset-shadow-key hover:from-fail hover:to-fail-ink active:translate-y-px active:shadow-none active:inset-shadow-pressed disabled:not-aria-busy:opacity-45",
  link: "h-auto rounded-sm border-0 p-0 text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink disabled:not-aria-busy:opacity-45",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleOptions = {}): string {
  return cn(BASE, SIZES[size], VARIANTS[variant], className);
}

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

// Defaults to type="button" so a button inside a form never submits it by accident.
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  const iconOnly = size === "icon" || size === "icon-sm";
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({
        variant,
        size,
        className: cn(loading && "[&>svg:not(.animate-spin)]:hidden", className),
      })}
    >
      {loading ? <Spinner className={size === "lg" ? "size-5" : undefined} /> : null}
      {loading && iconOnly ? null : children}
    </button>
  );
}
