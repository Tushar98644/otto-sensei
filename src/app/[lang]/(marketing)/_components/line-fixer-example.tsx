import { Mic } from "lucide-react";
import type { ReactNode } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { SpeechBubble } from "@/components/mascot/speech-bubble";
import { LivePill } from "@/components/ui/live-pill";
import { StatusPill } from "@/components/ui/status";
import type { MomentProps } from "./how-it-works-moments";

export function LineFixerMoment({ t }: MomentProps) {
  const words = t.how.fixer;
  return (
    <div className="relative flex flex-col gap-6 rounded-2xl bg-surface p-4 pb-8 sm:p-6 sm:pb-10">
      <ResumeLine chip={<StatusPill status="warn">{words.addNumber}</StatusPill>}>
        <span className="sr-only">{words.before}</span>
        {words.line}
      </ResumeLine>

      <OttoNote size="sm" meta={words.questions} live={false} message={words.question} />

      <div className="flex flex-col items-end gap-1 pl-10">
        <p className="flex items-center gap-2 text-sm/5 text-subtle">
          {words.you}
          <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-xs font-medium text-white">
            <Mic aria-hidden className="size-3" />
            {words.saidOutLoud}
          </span>
        </p>
        <SpeechBubble tone="ink" className="rounded-br-md">
          {words.answer}
        </SpeechBubble>
      </div>

      <ResumeLine chip={<StatusPill status="pass">{words.looksGood}</StatusPill>}>
        <span className="sr-only">{words.after}</span>
        {words.fixed}
      </ResumeLine>

      <LivePill announce={false} className="absolute right-6 -bottom-4">
        {words.updated}
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
