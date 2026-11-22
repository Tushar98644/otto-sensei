import { cn } from "@/lib/utils";
import { interviewWhen } from "./when";

export function InterviewTicket({ at, now }: { at: number; now: number }) {
  const when = interviewWhen(at, now);
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg p-1.5 pr-2.5 inset-ring",
        when.soon ? "bg-otter-light/55 inset-ring-otter/12" : "bg-surface-hover inset-ring-ink/5",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex w-8 shrink-0 flex-col overflow-hidden rounded-md bg-surface text-center shadow-control ring-1 ring-ink/8",
          when.past && "opacity-75",
        )}
      >
        <span
          className={cn(
            "text-[10px]/[14px] font-semibold tracking-[0.08em] text-white",
            when.past ? "bg-border-strong" : "bg-otter",
          )}
        >
          {when.month}
        </span>
        <span className="text-sm/5 font-semibold text-ink tabular-nums">{when.day}</span>
      </span>
      <p className="min-w-0">
        <span
          className={cn(
            "block text-[13px]/[18px] font-semibold",
            when.past ? "text-muted" : "text-ink",
          )}
        >
          {when.lead}
        </span>
        <span className="block text-xs/4 text-muted">{when.detail}</span>
        <span className="sr-only">, {when.spoken}</span>
      </p>
    </div>
  );
}
