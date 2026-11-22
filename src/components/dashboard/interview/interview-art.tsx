import { Check } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { CalendarPage } from "@/components/dashboard/home/up-next/calendar";
import { Otto, PLAY_TWICE } from "@/components/mascot/otto";
import { cn } from "@/lib/utils";

const MOVE = "transition duration-300 ease-out";
const PAPER = "rounded-md bg-surface shadow-page";
const BAR = "block h-1 rounded-full bg-surface-strong";

// Lifts with any card marked group/art, so the art answers the hover on the whole card.
const LIFT = "group-hover/art:-translate-y-1";

export function Stage({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden rounded-xl bg-surface-muted", className)}
      style={{ "--otto-delay": "-1.4s" } as CSSProperties}
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

// A desk page with no day on it yet, drawn like CalendarPage.
function UndatedPage() {
  return (
    <div className="relative w-24">
      <div className="overflow-hidden rounded-lg bg-surface text-center shadow-page">
        <div className="h-6 bg-primary/70" />
        <div className="pt-1.5 font-display text-4xl/10 text-subtle">?</div>
        <div className="mx-auto mt-1.5 mb-3 h-1 w-10 rounded-full bg-surface-strong" />
      </div>
      <span className="absolute -top-1 left-6 h-3 w-1.5 rounded-full bg-ink/75 ring-2 ring-surface-muted" />
      <span className="absolute -top-1 right-6 h-3 w-1.5 rounded-full bg-ink/75 ring-2 ring-surface-muted" />
    </div>
  );
}

function Seal({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-4 items-center justify-center rounded-full bg-primary text-white",
        className,
      )}
    >
      <Check className="size-2.5" strokeWidth={3} />
    </span>
  );
}

// A question card: the interviewer's words as a quote mark and two lines.
function CueCard({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={cn("relative w-32 p-3", PAPER, className)}>
      <span className="block font-display text-2xl/4 text-ink/70">“</span>
      <span className={cn(BAR, "mt-1.5 w-full bg-border-strong/45")} />
      <span className={cn(BAR, "mt-1.5 w-4/5 bg-border-strong/45")} />
      {children}
    </div>
  );
}

// The day ahead: unprepared, Otto points at it; prepared, he reads his notes beside it.
export function InterviewArt({
  at,
  prepared,
  className,
}: {
  at: number | null;
  prepared: boolean;
  className?: string;
}) {
  const page = at === null ? <UndatedPage /> : <CalendarPage at={at} />;
  if (prepared) {
    return (
      <Stage className={className}>
        <Prop
          side="left-[20%] sm:left-[16%]"
          className={cn("-rotate-4 group-hover/art:-rotate-1", LIFT)}
        >
          <Float delay={-1.5}>{page}</Float>
        </Prop>
        <Otto
          pose="read"
          size={100}
          lively
          settle
          className="absolute right-[16%] -bottom-1 sm:right-[12%]"
        />
      </Stage>
    );
  }
  return (
    <Stage className={className}>
      <Otto
        pose="point"
        size={100}
        lively
        settle
        className="absolute -bottom-1 left-[14%] sm:left-[10%]"
      />
      <Prop
        side="right-[18%] sm:right-[14%]"
        className={cn("rotate-3 group-hover/art:rotate-1", LIFT)}
      >
        <Float delay={-1.5}>{page}</Float>
      </Prop>
    </Stage>
  );
}

// Otto with a fanned stack of question cards; the front one earns its check.
export function CueCardsArt({ className }: { className?: string }) {
  return (
    <Stage className={className}>
      <Otto
        pose="point"
        size={100}
        lively
        settle
        className="absolute -bottom-1 left-[14%] sm:left-[4%]"
      />
      <Prop side="right-[16%] sm:right-[8%]" className={LIFT}>
        <div className="relative">
          <div
            className={cn("absolute inset-0 rotate-6", PAPER, MOVE, "group-hover/art:rotate-9")}
          />
          <div
            className={cn("absolute inset-0 rotate-2", PAPER, MOVE, "group-hover/art:rotate-4")}
          />
          <Float delay={-2}>
            <CueCard className="-rotate-2">
              <span className="mt-2.5 flex items-center gap-1.5">
                <span className="grid">
                  <span
                    className={cn(
                      "col-start-1 row-start-1 size-4 rounded-full border border-dashed border-border-strong motion-safe:animate-scene-keyword-out",
                      PLAY_TWICE,
                    )}
                  />
                  <Seal
                    className={cn(
                      "col-start-1 row-start-1 opacity-0 motion-safe:animate-scene-keyword-in",
                      PLAY_TWICE,
                    )}
                  />
                </span>
                <span className={cn(BAR, "w-10")} />
              </span>
            </CueCard>
          </Float>
        </div>
      </Prop>
    </Stage>
  );
}

// A line from the resume, highlighted, becomes a story card: S, T, A and R.
export function StoryArt({ className }: { className?: string }) {
  return (
    <Stage className={className}>
      <Otto
        pose="point"
        size={100}
        lively
        settle
        className="absolute -bottom-1 left-[10%] sm:left-[3%]"
      />
      <Prop side="right-[16%] sm:right-[13%]" className={LIFT}>
        <div className="relative">
          <div className={cn("w-32 -rotate-3 p-3", PAPER)}>
            <span className="mx-auto block h-1.5 w-12 rounded-full bg-otter/60" />
            <span className={cn(BAR, "mt-3 w-full")} />
            <span className="mt-1.5 block rounded-xs bg-highlight px-0.5 py-0.5">
              <span className="block h-1 w-full rounded-full bg-ink/35" />
            </span>
            <span className={cn(BAR, "mt-1.5 w-4/5")} />
            <span className={cn(BAR, "mt-1.5 w-11/12")} />
          </div>
          <div className="absolute -right-5 -bottom-9 rotate-3">
            <Float delay={-2.5}>
              <div className={cn("flex w-24 flex-col gap-1.5 p-2.5", PAPER)}>
                {["S", "T", "A", "R"].map((letter) => (
                  <span key={letter} className="flex items-center gap-1.5">
                    <span className="flex size-3.5 items-center justify-center rounded-full bg-primary/10 text-[0.5rem] font-semibold text-primary">
                      {letter}
                    </span>
                    <span className={cn(BAR, letter === "A" ? "w-10" : "w-12")} />
                  </span>
                ))}
              </div>
            </Float>
          </div>
        </div>
      </Prop>
    </Stage>
  );
}
