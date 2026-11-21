import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// Quiet on purpose: Free should read as the product, not a demo of it.
export function ProMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-xs/4 font-medium text-subtle",
        className,
      )}
    >
      <Lock aria-hidden className="size-3" />
      <span className="sr-only">, comes with </span>
      Pro
    </span>
  );
}
