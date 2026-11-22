import type { CSSProperties } from "react";
import { Otto, PLAY_TWICE } from "@/components/mascot/otto";
import { cn } from "@/lib/utils";

const MOVE = "transition duration-300 ease-out";
const BAR = "block h-1 rounded-full";

// Otto signs off a letter: the last line writes itself in while he thinks, an envelope waits behind.
export function LettersArt({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("relative h-40 overflow-hidden rounded-xl bg-surface-muted", className)}
      style={{ "--otto-delay": "-3.1s" } as CSSProperties}
    >
      <div className="absolute inset-y-0 right-3 flex items-center pb-2">
        <div className="relative h-30 w-46">
          <div
            className={cn(
              "absolute top-7 right-0 w-28 rotate-6 group-hover/otto:translate-x-1 group-hover/otto:rotate-8",
              MOVE,
            )}
          >
            <div className="relative h-18 overflow-hidden rounded-md bg-surface shadow-page">
              <svg
                viewBox="0 0 112 72"
                className="absolute inset-0 size-full text-border-strong/60"
              >
                <path d="M3 5 L56 42 L109 5" fill="none" stroke="currentColor" strokeWidth={1.5} />
              </svg>
              <span className="absolute top-2 right-2 size-4.5 rounded-xs border border-dashed border-otter/50 bg-otter-light" />
            </div>
          </div>
          <div
            className={cn(
              "absolute top-0 left-0 w-32 -rotate-3 group-hover/otto:-translate-y-1 group-hover/otto:-rotate-1",
              MOVE,
            )}
          >
            <div
              className={cn(
                "flex flex-col gap-1.5 rounded-md bg-surface p-3 shadow-page motion-safe:animate-scene-float",
                PLAY_TWICE,
              )}
              style={{ "--scene-delay": "-1.2s" } as CSSProperties}
            >
              <span className={cn(BAR, "h-1.5 w-10 bg-ink/25")} />
              <span className={cn(BAR, "mt-1 w-full bg-surface-strong")} />
              <span className={cn(BAR, "w-11/12 bg-surface-strong")} />
              <span className={cn(BAR, "w-4/5 bg-surface-strong")} />
              <span className="mt-1 grid">
                <span
                  className={cn(
                    "col-start-1 row-start-1 flex items-center motion-safe:animate-scene-keyword-out",
                    PLAY_TWICE,
                  )}
                >
                  <span className={cn(BAR, "w-1/3 border border-dashed border-border-strong")} />
                </span>
                <span
                  className={cn(
                    "col-start-1 row-start-1 flex items-center opacity-0 motion-safe:animate-scene-keyword-in",
                    PLAY_TWICE,
                  )}
                >
                  <span className={cn(BAR, "w-full bg-ink/30")} />
                </span>
              </span>
              <svg viewBox="0 0 48 12" className="mt-1.5 h-3 w-12 text-otter">
                <path
                  d="M1 9 C 5 1, 8 1, 9 7 S 14 11, 17 5 S 23 2, 24 8 S 31 9, 34 4 S 41 6, 47 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <Otto pose="think" size={100} lively settle className="absolute -bottom-1 left-3" />
    </div>
  );
}
