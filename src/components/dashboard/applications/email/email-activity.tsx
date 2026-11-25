"use client";

import { ArrowRight, CalendarClock, Check, Mail, ShieldQuestion, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusIcon } from "@/components/dashboard/applications/status-menu";
import { timeAgo, type TimeWords } from "@/components/notifications/time-ago";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
import { CompanyMark } from "@/components/ui/company-mark";
import { FolderCard } from "@/components/ui/folder-card";
import { toast } from "@/components/ui/toast";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Application } from "@/lib/applications/schema";
import type { ApplicationStatus } from "@/lib/applications/status";
import { applicationHref } from "@/lib/applications/thread";
import type { EmailEvent } from "@/lib/inbound/types";
import type { EmailMessages } from "../../i18n";
import { cn } from "@/lib/utils";
import { ACTIVITY_ID } from "./track-card";
import {
  changeFromEmail,
  dismissEmail,
  useEmailTracking,
  useTrackingWords,
} from "./use-email-tracking";
import {
  canUndo,
  changeLine,
  interviewLine,
  proposalLine,
  splitEvents,
  type EmailWords,
} from "./view";

// The reader's words for status changes and times, read once per row.
function useWords(): EmailWords & { email: EmailMessages; time: TimeWords } {
  const email = useMessages("email");
  const { statuses } = useMessages("applications");
  const format = useFormat();
  const { justNow } = useMessages("app");
  return { email, statuses, format, time: { format, justNow } };
}

const SHOWN = 5;
const CHIP =
  "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap";

function StatusChip({ status }: { status: ApplicationStatus }) {
  const { statuses } = useMessages("applications");
  return (
    <span className={cn(CHIP, "bg-surface-muted text-muted")}>
      <StatusIcon status={status} className="size-3.5" />
      {statuses[status]}
    </span>
  );
}

function Change({ event }: { event: EmailEvent }) {
  const words = useWords();
  const undone = event.undoneAt !== null;
  if (!undone && event.change === "moved" && event.fromStatus && event.toStatus) {
    return (
      <span className="flex flex-wrap items-center gap-1.5">
        <StatusChip status={event.fromStatus} />
        <ArrowRight aria-label={words.email.activity.to} className="size-3.5 text-subtle" />
        <StatusChip status={event.toStatus} />
      </span>
    );
  }
  return (
    <span
      className={cn("text-sm/5", undone || event.change === "none" ? "text-subtle" : "text-ink")}
    >
      {changeLine(event, words)}
    </span>
  );
}

function Row({
  event,
  exists,
  now,
  onUndo,
  busy,
}: {
  event: EmailEvent;
  exists: boolean;
  now: number;
  onUndo: () => void;
  busy: boolean;
}) {
  const words = useWords();
  const t = words.email;
  const name = event.company || event.sender;
  const when =
    event.kind === "interview" && event.change !== "none" ? interviewLine(event, words.format) : "";
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <CompanyMark name={name} size="sm" className={cn(event.undoneAt !== null && "opacity-50")} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-sm/5">
          {exists && event.applicationId ? (
            <Link
              href={applicationHref(event.applicationId)}
              className="font-semibold text-ink decoration-ink/30 underline-offset-4 hover:underline"
            >
              {name}
            </Link>
          ) : (
            <span className="font-semibold text-ink">{name}</span>
          )}
          {event.role ? <span className="text-muted"> · {event.role}</span> : null}
          <span className="text-subtle"> · {t.kinds[event.kind]}</span>
        </p>
        <Change event={event} />
        {when ? (
          <p className="flex items-start gap-1.5 text-sm/5 text-ink">
            <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
            {when}
          </p>
        ) : null}
        <p className="flex min-w-0 items-center gap-1.5 text-xs/5 text-subtle">
          <Mail aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">
            {event.sender} · {event.subject || t.activity.noSubject}
            {event.trust ? ` · ${t.trust[event.trust]}` : ""}
          </span>
        </p>
      </div>
      <div className="col-start-2 flex items-center gap-2 sm:col-start-3 sm:row-start-1 sm:flex-col sm:items-end sm:gap-1.5">
        <span className="text-xs/5 whitespace-nowrap text-subtle">
          {now > 0 ? timeAgo(event.receivedAt, now, words.time) : ""}
        </span>
        {canUndo(event) && exists ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            aria-busy={busy}
            disabled={busy}
            aria-label={fmt(t.activity.undoLabel, { name, change: changeLine(event, words) })}
          >
            <Undo2 aria-hidden />
            {t.activity.undo}
          </Button>
        ) : canUndo(event) ? (
          <span className="text-xs/5 text-subtle">{t.activity.deleted}</span>
        ) : null}
      </div>
    </li>
  );
}

function CheckRow({
  event,
  now,
  busy,
  onApply,
  onIgnore,
}: {
  event: EmailEvent;
  now: number;
  busy: boolean;
  onApply: () => void;
  onIgnore: () => void;
}) {
  const words = useWords();
  const t = words.email;
  const name = event.company || event.sender;
  const line = proposalLine(event, words);
  const nothing = event.proposal?.change === "none";
  return (
    <li className="flex flex-col gap-3 rounded-xl bg-surface-muted p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
      <div className="flex min-w-0 flex-1 gap-3">
        <CompanyMark name={name} size="sm" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm/5 font-semibold text-pretty text-ink">{line}</p>
          <p className="text-sm/5 text-muted">
            {t.kinds[event.kind]}
            {event.role ? ` · ${event.role}` : ""}
            {now > 0 ? (
              <span className="text-subtle"> · {timeAgo(event.receivedAt, now, words.time)}</span>
            ) : null}
          </p>
          <p className="flex min-w-0 items-center gap-1.5 text-xs/5 text-subtle">
            <Mail aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">
              {event.sender} · {event.subject || t.activity.noSubject}
            </span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 max-sm:pl-11">
        <Button
          variant="ghost"
          size="sm"
          onClick={onIgnore}
          disabled={busy}
          aria-label={fmt(t.activity.ignoreLabel, { line })}
        >
          {t.activity.ignore}
        </Button>
        {nothing ? null : (
          <Button
            variant="secondary"
            size="sm"
            onClick={onApply}
            aria-busy={busy}
            disabled={busy}
            aria-label={fmt(t.activity.applyLabel, { line })}
          >
            <Check aria-hidden />
            {t.activity.apply}
          </Button>
        )}
      </div>
    </li>
  );
}

export function EmailActivity({ applications }: { applications: readonly Application[] }) {
  const { tracking, userId } = useEmailTracking();
  const words = useWords();
  const failWords = useTrackingWords();
  const t = words.email.activity;
  const now = useNow();
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  if (!tracking?.available || tracking.events.length === 0) return null;
  const { pending, changes, unread } = splitEvents(tracking);
  const ids = new Set(applications.map((application) => application.id));
  const shown = all ? changes : changes.slice(0, SHOWN);

  async function apply(event: EmailEvent) {
    setBusy(event.id);
    const done = await changeFromEmail(userId, event.id, "apply", failWords);
    setBusy(null);
    if (done)
      toast({ title: t.applied, description: proposalLine(event, words), variant: "success" });
  }

  async function undo(event: EmailEvent) {
    setBusy(event.id);
    const done = await changeFromEmail(userId, event.id, "undo", failWords);
    setBusy(null);
    if (done)
      toast({
        title: t.undone,
        description: fmt(t.backAsWas, { name: event.company || event.sender }),
        variant: "success",
      });
  }

  return (
    <section id={ACTIVITY_ID} aria-labelledby={`${ACTIVITY_ID}-title`} className="scroll-mt-24">
      <FolderCard
        tab={<span id={`${ACTIVITY_ID}-title`}>{t.tab}</span>}
        tabEnd={
          <span className="text-xs text-subtle tabular-nums">
            {words.format.plural(t.emailsRead, tracking.events.length)}
          </span>
        }
        bodyClassName="px-4 py-1 sm:px-6"
      >
        {pending.length > 0 ? (
          <div className="flex flex-col gap-2 border-b border-border py-4">
            <p className="flex items-center gap-1.5 text-xs/4 font-medium tracking-widest text-subtle uppercase">
              <ShieldQuestion aria-hidden className="size-3.5" />
              {t.check}
            </p>
            <p className="max-w-prose text-sm/5 text-pretty text-muted">{t.checkBody}</p>
            <ul className="mt-1 flex flex-col gap-2">
              {pending.map((event) => (
                <CheckRow
                  key={event.id}
                  event={event}
                  now={now}
                  busy={busy === event.id}
                  onApply={() => void apply(event)}
                  onIgnore={() => void dismissEmail(userId, event.id, failWords)}
                />
              ))}
            </ul>
          </div>
        ) : null}
        {changes.length > 0 ? (
          <ul className="divide-y divide-border">
            {shown.map((event) => (
              <Row
                key={event.id}
                event={event}
                exists={event.applicationId !== null && ids.has(event.applicationId)}
                now={now}
                busy={busy === event.id}
                onUndo={() => void undo(event)}
              />
            ))}
          </ul>
        ) : pending.length === 0 ? (
          <p className="py-4 text-sm/6 text-muted">{t.noChanges}</p>
        ) : null}
        {changes.length > SHOWN ? (
          <div className="border-t border-border py-3">
            <Button variant="ghost" size="sm" onClick={() => setAll(!all)}>
              {all ? t.fewer : fmt(t.all, { count: words.format.number(changes.length) })}
            </Button>
          </div>
        ) : null}
        {unread.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-border py-4">
            <p className="text-xs/4 font-medium tracking-widest text-subtle uppercase">
              {t.unread}
            </p>
            <p className="text-sm/5 text-pretty text-muted">{t.unreadBody}</p>
            <ul className="flex flex-col gap-1.5">
              {unread.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center gap-2 rounded-xl bg-surface-muted py-1.5 pr-1.5 pl-3"
                >
                  <Mail aria-hidden className="size-4 shrink-0 text-muted" />
                  <p className="min-w-0 flex-1 truncate text-sm/5 text-ink">
                    {event.subject || t.noSubject}
                    <span className="text-subtle">
                      {" "}
                      · {event.sender}
                      {now > 0 ? ` · ${timeAgo(event.receivedAt, now, words.time)}` : ""}
                    </span>
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={fmt(t.dismiss, { subject: event.subject || t.thisEmail })}
                    onClick={() => void dismissEmail(userId, event.id, failWords)}
                  >
                    <X aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </FolderCard>
    </section>
  );
}
