"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type Ref } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { Button, buttonClasses } from "@/components/ui/button";
import { SNOOZE_DAYS } from "@/lib/applications/follow-up";
import type { FollowUpActionResponse } from "@/lib/notifications/types";

export type ReminderRequest =
  | { kind: "done" | "snooze"; u: string; a: string; t: string }
  | { kind: "unsubscribe"; u: string; t: string };

type State = { kind: "ready" } | { kind: "working" } | { kind: "settled"; message: string };

type Confirm = { message: string; label: string };

export const MISSING_PART = "That link is missing a part. Open your applications instead.";

// Mail scanners open (and some run) every link in an email, so nothing is sent until this press.
export const REMINDER_CONFIRM: Record<ReminderRequest["kind"], Confirm> = {
  done: {
    message: "Followed up on this one? Mark it done and I'll stop reminding you.",
    label: "Mark done",
  },
  snooze: {
    message: `Not ready to follow up yet? I'll remind you again in ${SNOOZE_DAYS} days.`,
    label: `Snooze ${SNOOZE_DAYS} days`,
  },
  unsubscribe: {
    message: "Turn off reminder emails? Your reminders stay in the bell in your dashboard.",
    label: "Turn off reminder emails",
  },
};

export type ReminderJob = { company: string; role: string };

export function confirmMessage(kind: ReminderRequest["kind"], job: ReminderJob | null): string {
  const company = job?.company.trim();
  if (!company || kind === "unsubscribe") return REMINDER_CONFIRM[kind].message;
  const role = job?.role.trim();
  if (kind === "snooze") {
    return `Not ready to follow up with ${company} yet? I'll remind you again in ${SNOOZE_DAYS} days.`;
  }
  return role
    ? `Followed up with ${company} about the ${role} job? Mark it done and I'll stop reminding you.`
    : `Followed up with ${company}? Mark it done and I'll stop reminding you.`;
}

const DAY = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });

export async function sendReminderAction(request: ReminderRequest): Promise<string> {
  if (request.kind === "unsubscribe") {
    const query = new URLSearchParams({ u: request.u, t: request.t });
    const res = await fetch(`/api/notifications/unsubscribe?${query.toString()}`, { method: "POST" });
    if (!res.ok) throw new Error("That unsubscribe link isn't valid. Turn emails off on your Account page.");
    return "Done. You won't get reminder emails any more. The bell in your dashboard keeps them.";
  }
  const res = await fetch("/api/notifications/follow-up", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ u: request.u, a: request.a, act: request.kind, t: request.t }),
  });
  const body = (await res.json().catch(() => null)) as
    | FollowUpActionResponse
    | { ok: false; error?: { message?: string } }
    | null;
  if (!res.ok || !body?.ok) {
    throw new Error(
      (body && !body.ok ? body.error?.message : undefined) ??
        "That didn't go through. Open your applications instead.",
    );
  }
  const name = body.company || "that job";
  if (request.kind === "done") return `Marked done. I won't remind you about ${name} again.`;
  return body.followUpAt === null
    ? `${name} has moved on from Applied, so there's nothing to snooze.`
    : `Snoozed for ${SNOOZE_DAYS} days. I'll remind you about ${name} on ${DAY.format(body.followUpAt)}.`;
}

function ApplicationsLink({ ref }: { ref?: Ref<HTMLAnchorElement> }) {
  return (
    <Link
      ref={ref}
      href={ROUTES.dashboardApplications}
      className={buttonClasses({ variant: "secondary" })}
    >
      Open your applications
    </Link>
  );
}

function ReminderConfirm({ request, job }: { request: ReminderRequest; job: ReminderJob | null }) {
  const [state, setState] = useState<State>({ kind: "ready" });
  const linkRef = useRef<HTMLAnchorElement>(null);
  const settled = state.kind === "settled";
  const confirm = REMINDER_CONFIRM[request.kind];

  // The pressed button goes away, so focus moves to what replaces it instead of the page.
  useEffect(() => {
    if (settled) linkRef.current?.focus();
  }, [settled]);

  function press() {
    setState({ kind: "working" });
    sendReminderAction(request).then(
      (message) => setState({ kind: "settled", message }),
      (error: unknown) =>
        setState({
          kind: "settled",
          message: error instanceof Error ? error.message : "That didn't go through.",
        }),
    );
  }

  return (
    <OttoNote message={settled ? state.message : confirmMessage(request.kind, job)}>
      {settled ? (
        <ApplicationsLink ref={linkRef} />
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
}: {
  request: ReminderRequest | null;
  job?: ReminderJob | null;
}) {
  if (request) return <ReminderConfirm request={request} job={job} />;
  return (
    <OttoNote message={MISSING_PART}>
      <ApplicationsLink />
    </OttoNote>
  );
}
