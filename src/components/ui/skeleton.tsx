import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Placeholder shape while content loads. Size it with classes, e.g. "h-4 w-40".
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      {...props}
      className={cn("animate-pulse rounded-md bg-surface-strong", className)}
    />
  );
}
