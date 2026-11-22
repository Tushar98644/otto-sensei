import { Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { Otto, PLAY_TWICE } from "@/components/mascot/otto";
import { cn } from "@/lib/utils";
import { WELL_HEIGHT } from "./paper-well";

const MOVE = "transition duration-300 ease-out";

function Bar({ className }: { className: string }) {
  return <span className={cn("block h-1 rounded-full", className)} />;
}

// A blank page, so it reads as a new resume rather than someone's.
function FreshPage() {
  return (
    <span className="flex aspect-17/22 w-full flex-col gap-1.5 rounded-xs bg-surface px-3 pt-3.5 shadow-page transition-shadow duration-300 ease-out group-hover/otto:shadow-page-lift">
      <Bar className="mx-auto h-1.5 w-1/2 bg-surface-strong" />
      <Bar className="mx-auto w-3/4 bg-surface-muted" />
      {[0, 1].map((block) => (
        <span key={block} className="mt-2 flex flex-col gap-1">
          <Bar className="w-1/3 bg-surface-strong" />
          <Bar className="w-full bg-surface-muted" />
          <Bar className="w-11/12 bg-surface-muted" />
          <Bar className="w-4/5 bg-surface-muted" />
        </span>
      ))}
    </span>
  );
}

export function AddArt() {
  return (
    <span
      aria-hidden
      className={cn(
        "relative block w-full overflow-hidden rounded-xl bg-surface-muted",
        WELL_HEIGHT,
      )}
      style={{ "--otto-delay": "-2.2s" } as CSSProperties}
    >
      <span className="absolute inset-y-0 left-1/2 block w-62 -translate-x-1/2">
        <span
          className={cn(
            "absolute top-14 left-29 block w-28 rotate-3 group-hover/otto:-translate-y-1.5 group-hover/otto:rotate-1",
            MOVE,
          )}
        >
          <span className={cn("block motion-safe:animate-scene-float", PLAY_TWICE)}>
            <FreshPage />
            <span className="absolute -top-2.5 -right-2.5 flex size-7 items-center justify-center rounded-full border border-border-control bg-surface text-ink shadow-control transition-transform duration-300 ease-out group-hover/otto:scale-110">
              <Plus className="size-4" strokeWidth={2} />
            </span>
          </span>
        </span>
        <Otto pose="point" size={100} lively settle className="absolute -bottom-1 left-0" />
      </span>
    </span>
  );
}
