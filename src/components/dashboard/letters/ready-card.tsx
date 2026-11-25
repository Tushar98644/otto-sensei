"use client";

import { Bookmark, Check, ClipboardPaste, Link2, Sparkles, type LucideIcon } from "lucide-react";
import { useId, type CSSProperties, type ReactNode } from "react";
import { CompanyMark } from "@/components/ui/company-mark";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Application } from "@/lib/applications/schema";
import { cn } from "@/lib/utils";
import type { WritingKind } from "@/lib/writings/schema";
import { InterviewTicket } from "../applications/board/card/interview-ticket";
import { StatusIcon } from "../applications/status-menu";
import { QuickActions, type QuickState } from "./quick-actions";
import type { WriteTarget } from "./write-targets";

export const CARD =
  "rounded-2xl bg-surface shadow-[0_1px_2px_rgb(18_36_29/0.04)] ring-1 ring-ink/4 transition-[translate,box-shadow] duration-200 ease-out hover:shadow-[0_1px_2px_rgb(18_36_29/0.05),0_14px_32px_-16px_rgb(18_36_29/0.24)] motion-safe:hover:-translate-y-0.5";

export const CHIP =
  "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs/none font-medium";

type Tone = "mist" | "pass" | "dashed";

export function Chip({
  icon: Icon,
  tone = "mist",
  children,
}: {
  icon: LucideIcon;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        CHIP,
        tone === "pass" && "bg-pass-soft text-pass-ink",
        tone === "mist" && "bg-surface-muted text-muted",
        tone === "dashed" && "border border-dashed border-border-strong text-muted",
      )}
    >
      <Icon
        aria-hidden
        className={cn("size-3.5", tone === "pass" && "text-pass")}
        strokeWidth={2.25}
      />
      {children}
    </span>
  );
}

function SourceChip({
  target,
  application,
}: {
  target: WriteTarget;
  application: Application | null;
}) {
  const { statuses } = useMessages("applications");
  const { ready } = useMessages("letters");
  if (application) {
    return (
      <span className={cn(CHIP, "bg-surface-muted text-muted")}>
        <StatusIcon status={application.status} className="size-3.5" />
        {statuses[application.status]}
      </span>
    );
  }
  return target.from === "job" ? (
    <Chip icon={Bookmark}>{ready.savedJob}</Chip>
  ) : (
    <Chip icon={Sparkles}>{ready.tailoredCopy}</Chip>
  );
}

function PostChip({ target }: { target: WriteTarget }) {
  const { ready } = useMessages("letters");
  if (target.post.kind === "saved" || target.post.kind === "feed") {
    return (
      <Chip icon={Check} tone="pass">
        {ready.postReady}
      </Chip>
    );
  }
  if (target.post.kind === "link") return <Chip icon={Link2}>{ready.fromLink}</Chip>;
  return (
    <Chip icon={ClipboardPaste} tone="dashed">
      {ready.needsPost}
    </Chip>
  );
}

export type ReadyCardProps = {
  target: WriteTarget;
  application: Application | null;
  source: string;
  now: number;
  state: QuickState;
  outreachKey: string | null;
  index: number;
  onWrite: (kind: WritingKind, extra?: { question?: string; post?: string }) => void;
  onOpen: (key: string) => void;
  onDismiss: () => void;
};

export function ReadyCard({
  target,
  application,
  source,
  now,
  state,
  outreachKey,
  index,
  onWrite,
  onOpen,
  onDismiss,
}: ReadyCardProps) {
  const { ready } = useMessages("letters");
  const untitled = ready.untitled;
  const titleId = useId();
  const interviewAt =
    application?.status === "interview" &&
    application.interviewAt !== null &&
    application.interviewAt >= now - 86_400_000
      ? application.interviewAt
      : null;

  return (
    <li
      className="motion-safe:animate-fade-in"
      style={index < 6 ? ({ animationDelay: `${index * 50}ms` } as CSSProperties) : undefined}
    >
      <article
        aria-labelledby={titleId}
        className={cn(CARD, "flex h-full flex-col gap-4 p-4 sm:p-5")}
      >
        <div className="flex gap-3 sm:gap-4">
          <CompanyMark name={target.company} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col">
            {target.company ? (
              <p className="pt-0.5 text-sm/5 font-medium text-pretty text-muted">
                {target.company}
              </p>
            ) : null}
            <h3
              id={titleId}
              className="mt-0.5 text-lg/6 font-semibold tracking-tight text-pretty text-ink"
            >
              {target.title || untitled}
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <SourceChip target={target} application={application} />
              <PostChip target={target} />
            </div>
          </div>
        </div>

        {interviewAt !== null ? <InterviewTicket at={interviewAt} now={now} /> : null}

        <div className="mt-auto flex flex-col gap-2">
          <QuickActions
            name={target.company || target.title || "this job"}
            describedBy={titleId}
            state={state}
            letter
            outreachKey={outreachKey}
            primary
            onWrite={onWrite}
            onOpen={onOpen}
            onDismiss={onDismiss}
          />
          {source && !state.run && state.ask === null ? (
            <p className="text-xs/5 text-subtle">{fmt(ready.writtenFrom, { source })}</p>
          ) : null}
        </div>
      </article>
    </li>
  );
}
