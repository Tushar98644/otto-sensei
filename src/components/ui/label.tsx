"use client";

import type { ComponentProps } from "react";
import { useMessagesOr } from "@/i18n/client";
import EN_UI from "@/i18n/messages/en/ui";
import { cn } from "@/lib/utils";

export type LabelProps = ComponentProps<"label"> & {
  optional?: boolean;
};

export function Label({ className, optional = false, children, ...props }: LabelProps) {
  const words = useMessagesOr("ui", EN_UI);
  return (
    <label {...props} className={cn("text-sm font-medium text-ink", className)}>
      {children}
      {optional ? <span className="font-normal text-muted">{` ${words.optional}`}</span> : null}
    </label>
  );
}
