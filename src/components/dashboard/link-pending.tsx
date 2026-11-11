"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

// Feedback on the link that was clicked while its page loads. Dashboard pages have no loading
// screen: the current page stays until the next one is ready, because a loading boundary made
// React hold every page change for at least 300 ms (its fallback throttle), even when the page
// arrived in 100. Faded in after a short delay, so quick moves show nothing. Must render inside a
// next/link <Link>.
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
