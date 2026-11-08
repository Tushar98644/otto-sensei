"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SNOOZE_DAYS } from "@/lib/applications/follow-up";
import type { FollowUpActionResponse } from "@/lib/notifications/types";

export type ReminderRequest =
  | { kind: "done" | "snooze"; u: string; a: string; t: string }
  | { kind: "unsubscribe"; u: string; t: string };

type Outcome =
  | { kind: "working" }
  | { kind: "done"; message: string }
  | { kind: "failed"; message: string };

const DAY = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });

async function send(request: ReminderRequest): Promise<string> {
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

export function ReminderAction({ request }: { request: ReminderRequest | null }) {
  const [outcome, setOutcome] = useState<Outcome>(
    request
      ? { kind: "working" }
      : { kind: "failed", message: "That link is missing a part. Open your applications instead." },
  );

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    send(request)
      .then((message) => {
        if (!cancelled) setOutcome({ kind: "done", message });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setOutcome({
            kind: "failed",
            message: error instanceof Error ? error.message : "That didn't go through.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

  if (outcome.kind === "working") {
    return (
      <p role="status" className="flex items-center gap-2 text-base/7 text-muted">
        <Spinner />
        Saving that
      </p>
    );
  }
  return (
    <OttoNote message={outcome.message}>
      <Link href={ROUTES.dashboardApplications} className={buttonClasses({ variant: "secondary" })}>
        Open your applications
      </Link>
    </OttoNote>
  );
}
