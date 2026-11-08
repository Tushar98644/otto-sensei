import type { ReactNode } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { SpeechBubble } from "@/components/mascot/speech-bubble";
import { LivePill } from "@/components/ui/live-pill";
import { StatusPill } from "@/components/ui/status";

// Step 3 of How it works: one weak line, Otto's question, the answer, and the line it became.
// Laid out like the studio's ruled lines, so the page shows what the editor really looks like.
export function LineFixerMoment() {
  return (
    <div className="relative flex flex-col gap-6 rounded-2xl bg-surface p-4 pb-8 sm:p-6 sm:pb-10">
      <ResumeLine chip={<StatusPill status="warn">Add a number</StatusPill>}>
        <span className="sr-only">Before: </span>
        Responsible for managing social media accounts
      </ResumeLine>

      <OttoNote size="sm" meta="1 question" live={false} message="How much did followers grow?" />

      <div className="flex flex-col items-end gap-1 pl-10">
        <p className="text-sm/5 text-subtle">You</p>
        <SpeechBubble tone="ink" className="rounded-br-md">
          They tripled in 6 months. I posted short videos every day.
        </SpeechBubble>
      </div>

      <ResumeLine chip={<StatusPill status="pass">Looks good</StatusPill>}>
        <span className="sr-only">After: </span>
        Grew social media followers 3x in 6 months by posting short videos daily
      </ResumeLine>

      <LivePill announce={false} className="absolute right-6 -bottom-4">
        Line updated
      </LivePill>
    </div>
  );
}

function ResumeLine({ chip, children }: { chip: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border-strong py-2.5 sm:flex-row sm:items-start sm:gap-3">
      <p className="min-w-0 flex-1 text-base/7 text-ink">{children}</p>
      <span className="shrink-0 sm:mt-0.5">{chip}</span>
    </div>
  );
}
