import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type SeparatorProps = ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
};

export function Separator({
  orientation = "horizontal",
  decorative = true,
  className,
  ...props
}: SeparatorProps) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      {...props}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch",
        className,
      )}
    />
  );
}
