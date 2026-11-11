"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

// Must render inside a next/link <Link>. No loading.tsx: React holds it for a 300 ms throttle.
export function LinkPending({ variant = "spinner" }: { variant?: "spinner" | "bar" }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return variant === "spinner" ? (
    <Spinner className="size-3.5 animate-fade-in text-muted [animation-delay:150ms]" />
  ) : (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-ink/40",
        "animate-fade-in [animation-delay:150ms]",
      )}
    />
  );
}
