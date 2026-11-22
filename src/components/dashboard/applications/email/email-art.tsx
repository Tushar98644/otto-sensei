import type { CSSProperties, ReactNode } from "react";
import { Otto, PLAY_TWICE } from "@/components/mascot/otto";
import { cn } from "@/lib/utils";

const BAR = "block h-1 rounded-full";

function MiniCard({ moving = false }: { moving?: boolean }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-md bg-surface p-1.5 ring-1 ring-ink/6",
        moving
          ? "shadow-page motion-safe:animate-scene-float"
          : "shadow-[0_1px_2px_rgb(18_36_29/0.06)]",
        moving && PLAY_TWICE,
      )}
      style={moving ? ({ "--scene-delay": "-2.4s" } as CSSProperties) : undefined}
    >
      <span className="size-3 shrink-0 rounded-[3px] bg-otter-light" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(BAR, "w-10/12 bg-ink/25")} />
        <span className={cn(BAR, "w-7/12 bg-surface-strong")} />
      </span>
    </span>
  );
}

function MiniColumn({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 self-start rounded-lg bg-surface-hover/80 p-1.5 ring-1 ring-ink/5">
      <span className="flex items-center gap-1 px-0.5">
        <span className={cn("h-2.5 w-0.5 rounded-full", tone)} />
        <span className={cn(BAR, "w-8 bg-ink/15")} />
      </span>
      {children}
    </div>
  );
}

// Otto reads the mail while a letter heads for the board and a card moves one column on.
export function EmailArt({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("relative h-40 overflow-hidden rounded-xl bg-surface-muted", className)}
      style={{ "--otto-delay": "-2.2s" } as CSSProperties}
    >
      <div className="absolute top-1/2 right-3 grid w-40 -translate-y-1/2 grid-cols-2 gap-1.5">
        <MiniColumn tone="bg-primary">
          <MiniCard />
          <MiniCard />
        </MiniColumn>
        <MiniColumn tone="bg-otter">
          <MiniCard moving />
        </MiniColumn>
      </div>
      <svg
        viewBox="0 0 96 48"
        className="absolute top-12 right-40 h-10 w-16 text-border-strong max-md:hidden"
      >
        <path
          d="M4 8 C 30 0, 64 10, 90 38"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeDasharray="3 4"
          strokeLinecap="round"
        />
        <path
          d="M80 36 L90 39 L89 29"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </svg>
      <div
        className={cn(
          "absolute top-4 left-26 w-14 -rotate-6 motion-safe:animate-scene-float md:top-6 md:left-8",
          PLAY_TWICE,
        )}
        style={{ "--scene-delay": "-0.8s" } as CSSProperties}
      >
        <div className="relative h-10 overflow-hidden rounded-md bg-surface shadow-page">
          <svg viewBox="0 0 56 40" className="absolute inset-0 size-full text-border-strong/70">
            <path d="M2 3 L28 22 L54 3" fill="none" stroke="currentColor" strokeWidth={1.4} />
          </svg>
          <span className="absolute top-1.5 right-1.5 size-2.5 rounded-xs border border-dashed border-otter/50 bg-otter-light" />
        </div>
      </div>
      <Otto pose="read" size={92} lively settle className="absolute -bottom-1 left-2" />
    </div>
  );
}
