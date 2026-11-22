import { cn } from "@/lib/utils";

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short" });
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long" });

export function calendarDay(at: number): { month: string; day: number; weekday: string } {
  const date = new Date(at);
  return { month: MONTH.format(date), day: date.getDate(), weekday: WEEKDAY.format(date) };
}

// A desk calendar page: forest header, two binder rings, the day in the display serif.
export function CalendarPage({ at, className }: { at: number; className?: string }) {
  const { month, day, weekday } = calendarDay(at);
  return (
    <div className={cn("relative w-24", className)}>
      <div className="overflow-hidden rounded-lg bg-surface text-center shadow-page">
        <div className="bg-primary pt-2 pb-1 text-[0.6875rem]/4 font-medium tracking-widest text-white uppercase">
          {month}
        </div>
        <div className="pt-1.5 font-display text-4xl/10 text-ink lining-nums tabular-nums">
          {day}
        </div>
        <div className="pt-0.5 pb-2.5 text-[0.625rem]/4 font-medium tracking-wider text-subtle uppercase">
          {weekday}
        </div>
      </div>
      <span className="absolute -top-1 left-6 h-3 w-1.5 rounded-full bg-ink/75 ring-2 ring-surface-muted" />
      <span className="absolute -top-1 right-6 h-3 w-1.5 rounded-full bg-ink/75 ring-2 ring-surface-muted" />
    </div>
  );
}

// The same page at icon size, for a dated step that isn't the lead.
export function CalendarChip({ at, className }: { at: number; className?: string }) {
  const { month, day } = calendarDay(at);
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 flex-col overflow-hidden rounded-lg bg-surface text-center shadow-control ring-1 ring-ink/8",
        className,
      )}
    >
      <span className="bg-primary text-[0.5625rem]/3.5 font-medium tracking-widest text-white uppercase">
        {month}
      </span>
      <span className="flex flex-1 items-center justify-center text-sm/none font-semibold text-ink tabular-nums">
        {day}
      </span>
    </span>
  );
}
