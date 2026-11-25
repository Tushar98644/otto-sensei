import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export const DEMO_NOTE = "Demo mode: these are sample suggestions. Add an AI key for real ones.";

// The studio passes its own words; other pages read English.
export function DemoNote({ className, text = DEMO_NOTE }: { className?: string; text?: string }) {
  return (
    <p role="note" className={cn("flex items-start gap-2 text-sm text-muted", className)}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      {text}
    </p>
  );
}
