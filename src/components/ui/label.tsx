"use client";

import type { ComponentProps } from "react";
import { useMessages } from "@/i18n/client";
import { cn } from "@/lib/utils";

export type LabelProps = ComponentProps<"label"> & {
  optional?: boolean;
};

// Only an optional field reads the ui namespace, so forms on pages without a provider can use Label too.
function OptionalMark() {
  return <span className="font-normal text-muted">{` ${useMessages("ui").optional}`}</span>;
}

export function Label({ className, optional = false, children, ...props }: LabelProps) {
  return (
    <label {...props} className={cn("text-sm font-medium text-ink", className)}>
      {children}
      {optional ? <OptionalMark /> : null}
    </label>
  );
}
