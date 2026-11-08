import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      {...props}
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-surface-strong px-1.5 font-sans text-xs font-medium text-muted",
        className,
      )}
    />
  );
}
