import { cn } from "@/lib/utils";
import { Otto } from "./otto";

// Otto's success moment: he pops up cheering once, then stands still (no blink), so the page is
// calm again straight away. Decorative; the toast or the page's own text says what happened.
// One per screen, and only right after the thing happened.
export function OttoCheer({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("block shrink-0", className)}>
      <Otto pose="cheer" size={96} animated={false} className="motion-safe:animate-pop" />
    </span>
  );
}
