import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export const DEMO_NOTE = "Demo mode: these are sample suggestions. Add an AI key for real ones.";

// Under fix and tailor results when the server answered without an AI key, so sample output is
// never mistaken for a real rewrite. Quiet on purpose: muted text, not an alert, since nothing is
// wrong with what the user did.
export function DemoNote({ className }: { className?: string }) {
  return (
    <p role="note" className={cn("flex items-start gap-2 text-sm text-muted", className)}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      {DEMO_NOTE}
    </p>
  );
}
