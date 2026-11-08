"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { SignInDialog } from "@/components/account/sign-in-dialog";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status";
import { checkEligibility } from "@/lib/eligibility/check";
import { deviceTimeZone } from "@/lib/eligibility/options";
import { isProfileStarted } from "@/lib/eligibility/profile";
import {
  RULE_LABELS,
  VERDICT_LABELS,
  VERDICT_STATUS,
  type EligibilityFinding,
} from "@/lib/eligibility/types";
import { useWorkProfile } from "./use-work-profile";
import { WorkProfileDialog } from "./work-profile-dialog";

export type EligibilityCardProps = {
  // The job's location field, "" when the board doesn't give one.
  location: string;
  // The post's plain text.
  text: string;
};

const HOUR_MS = 60 * 60 * 1000;

function FindingRow({ item }: { item: EligibilityFinding }) {
  return (
    <li className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={VERDICT_STATUS[item.verdict]}>
          {VERDICT_LABELS[item.verdict]}
        </StatusPill>
        <span className="text-sm font-medium text-ink">{RULE_LABELS[item.rule]}</span>
      </div>
      <p className="text-sm/6 text-pretty text-ink">{item.note}</p>
      <blockquote className="border-l-2 border-border-strong pl-3 text-sm/6 wrap-break-word text-muted">
        {item.source === "location" ? (
          `Job location: ${item.quote}`
        ) : (
          <>
            <span className="sr-only">The post says: </span>“{item.quote}”
          </>
        )}
      </blockquote>
    </li>
  );
}

// "Can they hire you from here?": the post's rules on where you live, visas, hours and job type,
// each checked against the work profile, with the line it comes from. Rule-based and in the
// browser, so it costs nothing and needs no account; the profile only sharpens the verdicts.
export function EligibilityCard({ location, text }: EligibilityCardProps) {
  const work = useWorkProfile();
  // Offsets only move with daylight saving, so the hour is precise enough and the check doesn't
  // rerun on every tick of the shared clock.
  const hour = Math.floor(useNow() / HOUR_MS) * HOUR_MS;
  const titleId = useId();
  const [editing, setEditing] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const profile = work.status === "ready" && work.updatedAt !== null ? work.profile : null;
  const settled = hour !== 0 && work.status !== "unknown" && work.status !== "loading";
  const findings = useMemo(
    () =>
      settled
        ? checkEligibility({ location, text }, profile, {
            now: hour,
            deviceTimeZone: deviceTimeZone(),
          })
        : [],
    [settled, location, text, profile, hour],
  );
  const started = profile !== null && isProfileStarted(profile);
  const gaps = findings.some((item) => item.gap !== undefined);

  let footer: string | null = null;
  if (findings.length > 0) {
    if (work.status === "error") {
      footer = "Couldn't load your work profile, so these aren't checked against it.";
    } else if (work.status === "signed_out") {
      footer = "Sign in and add your work profile to check these for you.";
    } else if (!started) {
      footer = "Add your work profile to check these for you.";
    } else if (gaps) {
      footer = "Fill in the rest of your work profile to answer the ones marked Check.";
    }
  }

  let action: ReactNode = null;
  if (work.status === "error" && findings.length > 0) {
    action = (
      <Button variant="secondary" size="sm" onClick={work.retry} className="self-start">
        Try again
      </Button>
    );
  } else if (work.status === "signed_out" && findings.length > 0) {
    action = (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setSigningIn(true)}
        className="self-start"
      >
        Sign in
      </Button>
    );
  } else if (work.status === "ready" && (findings.length > 0 || started)) {
    action = (
      <Button variant="secondary" size="sm" onClick={() => setEditing(true)} className="self-start">
        {started ? "Edit work profile" : "Add work profile"}
      </Button>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col rounded-2xl bg-surface-muted p-4 sm:p-6"
    >
      <Eyebrow>Before you apply</Eyebrow>
      <h3 id={titleId} className="mt-2 text-base/6 font-semibold text-ink">
        Can they hire you from here?
      </h3>
      {!settled ? (
        <div className="mt-4 flex flex-col gap-2" aria-hidden>
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : findings.length === 0 ? (
        <p className="mt-1 text-sm/6 text-muted">
          No rules found about where you live, visas, hours or job type. Otto only spots plain
          phrases, so skim the post too.
        </p>
      ) : (
        <>
          <p className="text-sm/6 text-subtle">
            {findings.length === 1
              ? "1 rule in this post"
              : `${findings.length} rules in this post`}
            {started ? ", checked against your work profile" : null}
          </p>
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {findings.map((item) => (
              <FindingRow key={item.rule} item={item} />
            ))}
          </ul>
        </>
      )}
      {settled && (footer || action) ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {footer ? <p className="text-sm/6 text-muted">{footer}</p> : null}
          {action}
        </div>
      ) : null}
      {work.status === "ready" ? (
        <WorkProfileDialog
          open={editing}
          onOpenChange={setEditing}
          userId={work.userId}
          profile={work.profile}
          saved={work.updatedAt !== null}
        />
      ) : null}
      <SignInDialog
        open={signingIn}
        onOpenChange={setSigningIn}
        reason="Sign in to save a work profile. Otto checks job posts against it."
      />
    </section>
  );
}
