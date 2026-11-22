import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import { Otto, PLAY_TWICE } from "@/components/mascot/otto";
import { COMPANY_TINTS } from "@/components/ui/company-mark";
import { cn } from "@/lib/utils";

const MOVE = "transition duration-300 ease-out";

function Seal({ have, className }: { have: boolean; className?: string }) {
  return have ? (
    <span
      className={cn(
        "flex size-4 items-center justify-center rounded-full bg-pass-soft text-pass",
        className,
      )}
    >
      <Check className="size-2.5" strokeWidth={3} />
    </span>
  ) : (
    <span
      className={cn("size-4 rounded-full border border-dashed border-border-strong", className)}
    />
  );
}

const POSTS = [
  {
    tint: COMPANY_TINTS[0]!,
    title: "w-14",
    meta: "w-9",
    lift: "group-hover/otto:-translate-y-0.5",
  },
  { tint: COMPANY_TINTS[2]!, title: "w-11", meta: "w-12", lift: "group-hover/otto:-translate-y-1" },
  {
    tint: COMPANY_TINTS[1]!,
    title: "w-12",
    meta: "w-8",
    lift: "group-hover/otto:-translate-y-0.5",
  },
] as const;

// Otto at work on the boards: a scan runs down the posts and the last one he points at earns its check.
export function JobsArt({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("relative h-40 overflow-hidden rounded-xl bg-surface-muted", className)}
      style={{ "--otto-delay": "-2.2s" } as CSSProperties}
    >
      <div className="absolute top-4 right-4 flex w-36 flex-col gap-1.5">
        {POSTS.map((post, index) => (
          <div
            key={post.tint.name}
            className={cn(
              "flex h-9 items-center gap-2 rounded-md bg-surface px-2 shadow-page",
              MOVE,
              post.lift,
            )}
          >
            <span
              className="size-5 shrink-0 rounded-[5px] inset-ring inset-ring-ink/6"
              style={{ backgroundColor: post.tint.bg }}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={cn("h-1.5 rounded-full bg-border-strong/50", post.title)} />
              <span className={cn("h-1 rounded-full bg-surface-strong", post.meta)} />
            </span>
            {index < 2 ? (
              <Seal have />
            ) : (
              <span className="grid">
                <Seal
                  have={false}
                  className={cn(
                    "col-start-1 row-start-1 motion-safe:animate-scene-keyword-out",
                    PLAY_TWICE,
                  )}
                />
                <Seal
                  have
                  className={cn(
                    "col-start-1 row-start-1 opacity-0 motion-safe:animate-scene-keyword-in",
                    PLAY_TWICE,
                  )}
                />
              </span>
            )}
          </div>
        ))}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-9 rounded-md bg-highlight opacity-0 mix-blend-multiply motion-safe:animate-scene-scan",
            PLAY_TWICE,
          )}
        />
      </div>
      <Otto pose="point" size={100} lively settle className="absolute -bottom-1 left-2" />
    </div>
  );
}
