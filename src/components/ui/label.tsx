import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type LabelProps = ComponentProps<"label"> & {
  // Says "(optional)" in words, so required fields need no asterisk.
  optional?: boolean;
};

export function Label({ className, optional = false, children, ...props }: LabelProps) {
  return (
    <label {...props} className={cn("text-sm font-medium text-ink", className)}>
      {children}
      {optional ? <span className="font-normal text-muted"> (optional)</span> : null}
    </label>
  );
}
