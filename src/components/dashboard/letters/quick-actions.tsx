"use client";

import { MessageSquareText, PenLine, Send, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WritingKind } from "@/lib/writings/schema";
import type { QuickRun } from "./use-quick-write";
import { PostBox, QuestionBox } from "./write-boxes";

export const WRITE_ACTIONS: Record<WritingKind, { label: string; icon: LucideIcon }> = {
  letter: { label: "Write letter", icon: PenLine },
  answer: { label: "Draft my answer", icon: MessageSquareText },
  outreach: { label: "Write outreach", icon: Send },
};

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
          action={WRITE_ACTIONS[want.kind]}
          onWrite={(post) => onWrite(want.kind, { question: want.question, post })}
          onCancel={cancel}
        />
      ) : asking ? (
        <QuestionBox
          action={WRITE_ACTIONS.answer}
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
              Write letter
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
              Open message
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
              Outreach
            </Button>
          )}
          <Button
            variant="ghost"
            size={primary ? "md" : "sm"}
            disabled={blocked}
            aria-label={`Answer a question for ${name}`}
            onClick={() => setAsking(true)}
            className={
              primary
                ? "max-sm:border-border-control max-sm:bg-surface max-sm:shadow-control"
                : undefined
            }
          >
            <MessageSquareText aria-hidden />
            Answer
          </Button>
        </div>
      )}
      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}
