"use client";

import { MessageSquareText, PenLine, Send, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { cn } from "@/lib/utils";
import type { WritingKind } from "@/lib/writings/schema";
import type { QuickRun } from "./use-quick-write";
import { PostBox, QuestionBox } from "./write-boxes";

export function useWriteActions(): Record<WritingKind, { label: string; icon: LucideIcon }> {
  const { quick } = useMessages("letters");
  return {
    letter: { label: quick.writeLetter, icon: PenLine },
    answer: { label: quick.draftAnswer, icon: MessageSquareText },
    outreach: { label: quick.writeOutreach, icon: Send },
  };
}

export type QuickState = {
  run: QuickRun | null;
  blocked: boolean;
  ask: string | null;
  error: string | null;
};

type Want = { kind: WritingKind; question: string };

// The keys under a job: each writes at once from what the app knows, and asks only for what it can't.
export function QuickActions({
  name,
  describedBy,
  state,
  letter,
  outreachKey,
  primary,
  onWrite,
  onOpen,
  onDismiss,
}: {
  name: string;
  describedBy: string;
  state: QuickState;
  letter: boolean;
  outreachKey: string | null;
  primary: boolean;
  onWrite: (kind: WritingKind, extra?: { question?: string; post?: string }) => void;
  onOpen: (key: string) => void;
  onDismiss: () => void;
}) {
  const t = useMessages("letters").quick;
  const actions = useWriteActions();
  const [want, setWant] = useState<Want | null>(null);
  const [asking, setAsking] = useState(false);
  const { run, blocked, ask, error } = state;

  function write(kind: WritingKind, question = "") {
    setWant({ kind, question });
    setAsking(false);
    onWrite(kind, { question });
  }

  function cancel() {
    setWant(null);
    setAsking(false);
    onDismiss();
  }

  return (
    <div className="flex flex-col gap-3">
      {run ? (
        <OttoWorking
          task={run.phase === "reading" ? "job" : run.kind}
          size="sm"
          className="min-h-16"
        />
      ) : ask !== null && want ? (
        <PostBox
          note={ask}
          action={actions[want.kind]}
          onWrite={(post) => onWrite(want.kind, { question: want.question, post })}
          onCancel={cancel}
        />
      ) : asking ? (
        <QuestionBox
          action={actions.answer}
          onWrite={(question) => write("answer", question)}
          onCancel={cancel}
        />
      ) : (
        <div
          className={cn(
            "items-center gap-2",
            primary ? "grid grid-cols-2 sm:flex sm:flex-wrap" : "flex flex-wrap",
          )}
        >
          {letter ? (
            <Button
              variant={primary ? "primary" : "secondary"}
              size={primary ? "md" : "sm"}
              disabled={blocked}
              aria-describedby={describedBy}
              onClick={() => write("letter")}
              className={primary ? "max-sm:col-span-2" : undefined}
            >
              <PenLine aria-hidden />
              {t.writeLetter}
            </Button>
          ) : null}
          {outreachKey ? (
            <Button
              variant="secondary"
              size={primary ? "md" : "sm"}
              aria-describedby={describedBy}
              onClick={() => onOpen(outreachKey)}
            >
              <Send aria-hidden />
              {t.openMessage}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size={primary ? "md" : "sm"}
              disabled={blocked}
              aria-describedby={describedBy}
              onClick={() => write("outreach")}
            >
              <Send aria-hidden />
              {t.outreach}
            </Button>
          )}
          <Button
            variant="ghost"
            size={primary ? "md" : "sm"}
            disabled={blocked}
            aria-label={fmt(t.answerFor, { name })}
            onClick={() => setAsking(true)}
            className={
              primary
                ? "max-sm:border-border-control max-sm:bg-surface max-sm:shadow-control"
                : undefined
            }
          >
            <MessageSquareText aria-hidden />
            {t.answer}
          </Button>
        </div>
      )}
      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}
