import type { CSSProperties } from "react";
import { CalendarPage } from "@/components/dashboard/home/up-next/calendar";
import { Otto, PLAY_TWICE, type OttoPose } from "@/components/mascot/otto";
import { splitDate } from "@/lib/career-log/month";
import type { LocalDate } from "@/lib/career-log/types";
import { cn } from "@/lib/utils";

const BAR = "block h-1 rounded-full bg-surface-strong";

// Noon that day in the browser's own clock, so the calendar page shows the right date.
function noonOf(date: LocalDate): number {
  const { year, month, day } = splitDate(date);
  return new Date(year, month - 1, day, 12).getTime();
}

// A notebook page with this month's tab and a fresh line in the lavender highlighter.
function NotebookPage({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex w-28 flex-col gap-2 rounded-md bg-surface p-3 shadow-page",
        className,
      )}
    >
      <span className="w-fit rounded-sm bg-lavender px-1.5 text-[0.5625rem]/4 font-medium tracking-wider text-ink uppercase">
        {label}
      </span>
      <span className={cn(BAR, "mt-1 w-20 bg-highlight")} />
      <span className={cn(BAR, "w-16")} />
      <span className={cn(BAR, "w-18")} />
      <span className={cn(BAR, "w-12")} />
      <span className="absolute inset-y-2 left-1 flex flex-col justify-around" aria-hidden>
        {[0, 1, 2, 3].map((ring) => (
          <span key={ring} className="size-1 rounded-full bg-border-strong" />
        ))}
      </span>
    </div>
  );
}

type StageProps = { className?: string; delay?: number };

// Otto reads the month's page: the log page and the check-in.
export function NotebookArt({
  label,
  pose = "read",
  className,
  delay = -1.8,
}: StageProps & { label: string; pose?: OttoPose }) {
  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden rounded-xl bg-surface-muted", className)}
      style={{ "--otto-delay": `${delay}s` } as CSSProperties}
    >
      <div className="absolute inset-y-0 right-5 flex items-center pb-3">
        <NotebookPage
          label={label}
          className={cn("rotate-2 motion-safe:animate-scene-float", PLAY_TWICE)}
        />
      </div>
      <Otto pose={pose} size={96} lively settle className="absolute -bottom-1 left-2" />
    </div>
  );
}

// The next check-in on a desk calendar page, with Otto pointing at it; while off, the day it would be, faded.
export function CheckinArt({
  date,
  on,
  className,
  delay = -3.1,
}: StageProps & { date: LocalDate; on: boolean }) {
  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden rounded-xl bg-surface-muted", className)}
      style={{ "--otto-delay": `${delay}s` } as CSSProperties}
    >
      <div className="absolute inset-y-0 right-6 flex items-center pt-1">
        <div className="relative">
          <CalendarPage
            at={noonOf(date)}
            className={cn("-rotate-2", !on && "opacity-55 grayscale")}
          />
          {on ? null : (
            <span className="absolute -right-2 -bottom-2 rounded-full bg-ink px-2 py-0.5 text-[0.625rem]/4 font-medium tracking-wider text-white uppercase">
              Off
            </span>
          )}
        </div>
      </div>
      <Otto pose="point" size={96} lively settle className="absolute -bottom-1 left-2" />
    </div>
  );
}
