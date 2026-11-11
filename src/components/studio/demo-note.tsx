import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export const DEMO_NOTE = "Demo mode: these are sample suggestions. Add an AI key for real ones.";

// So sample output (no AI key) is never taken for a real rewrite. Muted: nothing is wrong.
export function DemoNote({ className }: { className?: string }) {
  return (
    <p role="note" className={cn("flex items-start gap-2 text-sm text-muted", className)}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      {DEMO_NOTE}
    </p>
  );
}
