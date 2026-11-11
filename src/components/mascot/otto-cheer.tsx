import { cn } from "@/lib/utils";
import { Otto } from "./otto";

// Cheers once, then stands still. Decorative. One per screen, right after the thing happened.
export function OttoCheer({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("block shrink-0", className)}>
      <Otto pose="cheer" size={96} animated={false} className="motion-safe:animate-pop" />
    </span>
  );
}
