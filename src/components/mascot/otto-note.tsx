import type { ReactNode } from "react";
import { OttoMark } from "@/components/site/otto-mark";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

export type OttoNoteProps = {
  message: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  live?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function OttoNote({
  message,
  meta,
  children,
  live = true,
  size = "md",
  className,
}: OttoNoteProps) {
  const small = size === "sm";
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-border",
            small ? "size-7" : "size-9",
          )}
        >
          <OttoMark className={small ? "size-5" : "size-7"} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm/5 text-subtle">
            <span className="font-medium text-ink">{BRAND.mascotName}</span>
            {meta ? <> · {meta}</> : null}
          </p>
          <p
            aria-live={live ? "polite" : undefined}
            aria-atomic={live ? true : undefined}
            className={cn("mt-1 text-pretty text-ink", small ? "text-sm/6" : "text-base/7")}
          >
            {message}
          </p>
        </div>
      </div>
      {children ? (
        <div className={cn("mt-3 flex flex-wrap gap-2", small ? "pl-10" : "pl-12")}>{children}</div>
      ) : null}
    </div>
  );
}
