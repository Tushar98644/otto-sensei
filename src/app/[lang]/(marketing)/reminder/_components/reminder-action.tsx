"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type Ref } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { Button, buttonClasses } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { formatFor } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import { SNOOZE_DAYS } from "@/lib/applications/follow-up";
import type { FollowUpActionResponse } from "@/lib/notifications/types";

// The page has no messages provider: its server page hands these words and the locale over.
export type ReminderWords = Messages["account"]["reminder"];

export type ReminderRequest =
  | { kind: "done" | "snooze"; u: string; a: string; t: string }
  | { kind: "unsubscribe"; u: string; t: string };

type State = { kind: "ready" } | { kind: "working" } | { kind: "settled"; message: string };

type Confirm = { message: string; label: string };

// Mail scanners open (and some run) every link in an email, so nothing is sent until this press.
export function reminderConfirm(words: ReminderWords): Record<ReminderRequest["kind"], Confirm> {
  const days = { days: SNOOZE_DAYS };
  return {
    done: words.done,
    snooze: { message: fmt(words.snooze.message, days), label: fmt(words.snooze.label, days) },
    unsubscribe: words.unsubscribe,
  };
}

export type ReminderJob = { company: string; role: string };

export function confirmMessage(
  words: ReminderWords,
  kind: ReminderRequest["kind"],
  job: ReminderJob | null,
): string {
  const company = job?.company.trim();
  if (!company || kind === "unsubscribe") return reminderConfirm(words)[kind].message;
  const role = job?.role.trim();
  if (kind === "snooze") return fmt(words.snoozeCompany, { company, days: SNOOZE_DAYS });
  return role ? fmt(words.doneRole, { company, role }) : fmt(words.doneCompany, { company });
}

const DAY = { weekday: "long", month: "short", day: "numeric" } as const;

export async function sendReminderAction(
  words: ReminderWords,
  locale: Locale,
  request: ReminderRequest,
): Promise<string> {
  if (request.kind === "unsubscribe") {
    const query = new URLSearchParams({ u: request.u, t: request.t });
    const res = await fetch(`/api/notifications/unsubscribe?${query.toString()}`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(words.badUnsubscribe);
    return words.unsubscribed;
  }
  const res = await fetch("/api/notifications/follow-up", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ u: request.u, a: request.a, act: request.kind, t: request.t }),
  });
  const body = (await res.json().catch(() => null)) as
    FollowUpActionResponse | { ok: false; error?: { message?: string } } | null;
  if (!res.ok || !body?.ok) {
    throw new Error((body && !body.ok ? body.error?.message : undefined) ?? words.failed);
  }
  const name = body.company || words.thatJob;
  if (request.kind === "done") return fmt(words.marked, { name });
  return body.followUpAt === null
    ? fmt(words.movedOn, { name })
    : fmt(words.snoozed, {
        days: SNOOZE_DAYS,
        name,
        day: formatFor(locale).date(body.followUpAt, DAY),
      });
}

function ApplicationsLink({ label, ref }: { label: string; ref?: Ref<HTMLAnchorElement> }) {
  return (
    <Link
      ref={ref}
      href={ROUTES.dashboardApplications}
      className={buttonClasses({ variant: "secondary" })}
    >
      {label}
    </Link>
  );
}

type Words = { words: ReminderWords; locale: Locale };

function ReminderConfirm({
  request,
  job,
  words,
  locale,
}: Words & { request: ReminderRequest; job: ReminderJob | null }) {
  const [state, setState] = useState<State>({ kind: "ready" });
  const linkRef = useRef<HTMLAnchorElement>(null);
  const settled = state.kind === "settled";
  const confirm = reminderConfirm(words)[request.kind];

  // The pressed button goes away, so focus moves to what replaces it instead of the page.
  useEffect(() => {
    if (settled) linkRef.current?.focus();
  }, [settled]);

  function press() {
    setState({ kind: "working" });
    sendReminderAction(words, locale, request).then(
      (message) => setState({ kind: "settled", message }),
      (error: unknown) =>
        setState({
          kind: "settled",
          message: error instanceof Error ? error.message : words.failedShort,
        }),
    );
  }

  return (
    <OttoNote message={settled ? state.message : confirmMessage(words, request.kind, job)}>
      {settled ? (
        <ApplicationsLink label={words.applications} ref={linkRef} />
      ) : (
        <Button loading={state.kind === "working"} onClick={press}>
          {confirm.label}
        </Button>
      )}
    </OttoNote>
  );
}

export function ReminderAction({
  request,
  job = null,
  words,
  locale,
}: Words & {
  request: ReminderRequest | null;
  job?: ReminderJob | null;
}) {
  if (request) return <ReminderConfirm request={request} job={job} words={words} locale={locale} />;
  return (
    <OttoNote message={words.missing}>
      <ApplicationsLink label={words.applications} />
    </OttoNote>
  );
}
