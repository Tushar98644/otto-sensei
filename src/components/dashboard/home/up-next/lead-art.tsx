import { BriefcaseBusiness, Check, Plus } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Otto, PLAY_TWICE } from "@/components/mascot/otto";
import { cn } from "@/lib/utils";
import { CalendarPage } from "./calendar";
import type { StepScene } from "./step-view";

// Its own clock, so Otto here never moves in step with the three action cards below.
const DELAY = -2.2;
const MOVE = "transition duration-300 ease-out";
const PAPER = "rounded-md bg-surface shadow-page";
const BAR = "block h-1 rounded-full bg-surface-strong";

function Stage({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="relative h-40 overflow-hidden rounded-xl bg-surface-muted sm:h-full sm:min-h-44"
      style={{ "--otto-delay": `${DELAY}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function Float({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <div
      className={cn("motion-safe:animate-scene-float", PLAY_TWICE)}
      style={{ "--scene-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}

// Centred on the stage's height, which grows with the words beside it from sm up.
function Prop({
  side,
  className,
  children,
}: {
  side: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("absolute inset-y-0 flex items-center pb-4", side)}>
      <div className={cn(MOVE, className)}>{children}</div>
    </div>
  );
}

function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 4" preserveAspectRatio="none" className={cn("h-1 w-full", className)}>
      <path
        d="M0 2 Q 2 0 4 2 T 8 2 T 12 2 T 16 2 T 20 2 T 24 2 T 28 2 T 32 2 T 36 2 T 40 2 T 44 2 T 48 2"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Swap({ before, after }: { before: ReactNode; after: ReactNode }) {
  return (
    <span className="grid">
      <span
        className={cn("col-start-1 row-start-1 motion-safe:animate-scene-keyword-out", PLAY_TWICE)}
      >
        {before}
      </span>
      <span
        className={cn(
          "col-start-1 row-start-1 opacity-0 motion-safe:animate-scene-keyword-in",
          PLAY_TWICE,
        )}
      >
        {after}
      </span>
    </span>
  );
}

function InterviewScene({ at }: { at?: number }) {
  return (
    <Stage>
      <Prop
        side="left-[22%] sm:left-[14%]"
        className="-rotate-4 group-hover/lead:-translate-y-1 group-hover/lead:-rotate-1"
      >
        <Float delay={-1.5}>{at === undefined ? null : <CalendarPage at={at} />}</Float>
      </Prop>
      <Otto
        pose="read"
        size={100}
        lively
        settle
        className="absolute right-[18%] -bottom-1 sm:right-[10%]"
      />
    </Stage>
  );
}

function FixScene() {
  return (
    <Stage>
      <Otto
        pose="point"
        size={100}
        lively
        settle
        className="absolute -bottom-1 left-[12%] sm:left-[4%]"
      />
      <Prop
        side="right-[14%] sm:right-[7%]"
        className={cn(
          "w-36 rotate-2 p-3 group-hover/lead:-translate-y-1 group-hover/lead:rotate-1",
          PAPER,
        )}
      >
        <span className="block h-1.5 w-14 rounded-full bg-otter/70" />
        <span className={cn(BAR, "mt-3 w-full")} />
        <span className={cn(BAR, "mt-1.5 w-4/5")} />
        <span className="mt-2 block">
          <Swap
            before={
              <span className="block w-11/12">
                <span className={cn(BAR, "w-full bg-border-strong/45")} />
                <Squiggle className="mt-0.5 text-warn" />
              </span>
            }
            after={
              <span className="flex items-center gap-1">
                <span className={cn(BAR, "flex-1 bg-ink/35")} />
                <Check className="size-2.5 text-pass" strokeWidth={3} />
              </span>
            }
          />
        </span>
        <span className={cn(BAR, "mt-2 w-full")} />
        <span className={cn(BAR, "mt-1.5 w-3/5")} />
      </Prop>
    </Stage>
  );
}

function Keyword({ have }: { have: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 items-center gap-0.5 rounded-full px-1.5",
        have ? "bg-surface-muted" : "border border-dashed border-border-strong",
      )}
    >
      {have ? (
        <Check className="size-2.5 text-ink" strokeWidth={2.5} />
      ) : (
        <Plus className="size-2.5 text-ink" strokeWidth={2.5} />
      )}
      <span className={cn("h-1 rounded-full bg-border-strong/60", have ? "w-6" : "w-4")} />
    </span>
  );
}

function TailorScene() {
  return (
    <Stage>
      <Otto
        pose="point"
        size={100}
        lively
        settle
        className="absolute -bottom-1 left-[12%] sm:left-[4%]"
      />
      <Prop
        side="right-[14%] sm:right-[7%]"
        className={cn("w-38 rounded-lg p-3 group-hover/lead:-translate-y-1", PAPER)}
      >
        <span className="flex items-center gap-1.5">
          <BriefcaseBusiness className="size-3 text-muted" />
          <span className="h-1.5 w-14 rounded-full bg-border-strong/50" />
        </span>
        <span className={cn(BAR, "mt-2.5 w-full")} />
        <span className={cn(BAR, "mt-1 w-4/5")} />
        <span className="mt-2.5 flex flex-wrap gap-1">
          <Keyword have />
          <Swap before={<Keyword have={false} />} after={<Keyword have />} />
        </span>
      </Prop>
    </Stage>
  );
}

function FollowUpScene() {
  return (
    <Stage>
      <Prop
        side="left-[20%] sm:left-[12%]"
        className="w-30 -rotate-3 group-hover/lead:-translate-y-1 group-hover/lead:-rotate-1"
      >
        <Float delay={-2}>
          <div className={cn("relative h-20 overflow-hidden", PAPER)}>
            <svg viewBox="0 0 120 80" className="absolute inset-0 size-full text-border-strong/60">
              <path d="M4 6 L60 46 L116 6" fill="none" stroke="currentColor" strokeWidth={1.5} />
            </svg>
            <span className="absolute top-2.5 right-2.5 size-5 rounded-xs border border-dashed border-otter/50 bg-otter-light" />
          </div>
        </Float>
      </Prop>
      <Otto pose="wave" size={100} className="absolute right-[18%] -bottom-1 sm:right-[10%]" />
    </Stage>
  );
}

function SetupScene({ done, total }: { done: number; total: number }) {
  const rows = Math.min(Math.max(total, 2), 4);
  return (
    <Stage>
      <Prop
        side="left-[20%] sm:left-[10%]"
        className={cn(
          "flex w-34 -rotate-2 flex-col gap-2.5 p-3 group-hover/lead:-translate-y-1 group-hover/lead:rotate-0",
          PAPER,
        )}
      >
        {Array.from({ length: rows }, (_, row) => (
          <span key={row} className="flex items-center gap-2">
            {row < done ? (
              <span className="flex size-3.5 items-center justify-center rounded-full bg-primary">
                <Check className="size-2.5 text-white" strokeWidth={3} />
              </span>
            ) : (
              <span className="size-3.5 rounded-full border border-dashed border-border-strong" />
            )}
            <span className={cn(BAR, row % 2 ? "w-12" : "w-16")} />
          </span>
        ))}
      </Prop>
      <Otto
        pose="think"
        size={100}
        lively
        settle
        className="absolute right-[18%] -bottom-1 sm:right-[8%]"
      />
    </Stage>
  );
}

function MatchesScene() {
  return (
    <Stage>
      <Otto
        pose="point"
        size={100}
        lively
        settle
        className="absolute -bottom-1 left-[12%] sm:left-[4%]"
      />
      <Prop
        side="right-[14%] sm:right-[6%]"
        className="relative w-36 group-hover/lead:-translate-y-1"
      >
        <div className={cn("absolute inset-x-2 -top-2 h-16 rotate-3", PAPER)} />
        <div className={cn("relative p-3", PAPER)}>
          <span className="flex items-center gap-1.5">
            <BriefcaseBusiness className="size-3 text-muted" />
            <span className="h-1.5 w-12 rounded-full bg-border-strong/50" />
          </span>
          <span className={cn(BAR, "mt-2.5 w-full")} />
          <span className={cn(BAR, "mt-1 w-3/4")} />
          <span className="mt-2.5 inline-flex h-4 items-center gap-0.5 rounded-full bg-pass-soft px-1.5">
            <Check className="size-2.5 text-pass-ink" strokeWidth={3} />
            <span className="h-1 w-6 rounded-full bg-pass/40" />
          </span>
        </div>
      </Prop>
    </Stage>
  );
}

export function LeadArt({
  scene,
  at,
  setup,
}: {
  scene: StepScene;
  at?: number;
  setup?: { done: number; total: number };
}) {
  switch (scene) {
    case "interview":
      return <InterviewScene at={at} />;
    case "fix":
      return <FixScene />;
    case "tailor":
      return <TailorScene />;
    case "follow_up":
      return <FollowUpScene />;
    case "setup":
      return <SetupScene done={setup?.done ?? 0} total={setup?.total ?? 3} />;
    case "matches":
      return <MatchesScene />;
  }
}
