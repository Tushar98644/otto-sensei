"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

// Dashboard pages have no loading screen: a loading boundary made React hold every page change
// for its 300 ms fallback throttle, even when the page arrived in 100. Faded in after a short
// delay, so quick moves show nothing. Must render inside a next/link <Link>.
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
