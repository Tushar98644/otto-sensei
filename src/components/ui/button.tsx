import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button-classes";
import { Spinner } from "./spinner";

export { buttonClasses, type ButtonSize, type ButtonVariant } from "./button-classes";

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
