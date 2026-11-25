"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { LazySignInDialog } from "@/components/account/lazy-dialogs";
import { useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { useOtto } from "@/components/mascot/use-otto";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { checkEligibility } from "@/lib/eligibility/check";
import { deviceTimeZone } from "@/lib/eligibility/options";
import { isProfileStarted } from "@/lib/eligibility/profile";
import { VERDICT_STATUS, type EligibilityFinding } from "@/lib/eligibility/types";
import { HOUR_MS } from "@/lib/time";
import { useWorkProfile } from "./use-work-profile";
import { LazyWorkProfileDialog } from "./lazy-work-profile-dialog";

export type EligibilityCardProps = {
  location: string;
  text: string;
};

function FindingRow({ item }: { item: EligibilityFinding }) {
  const t = useMessages("workProfile").card;
  return (
    <li className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={VERDICT_STATUS[item.verdict]}>{t.verdicts[item.verdict]}</StatusPill>
        <span className="text-sm font-medium text-ink">{t.ruleLabels[item.rule]}</span>
      </div>
      <p className="text-sm/6 text-pretty text-ink">{item.note}</p>
      <blockquote className="border-l-2 border-border-strong pl-3 text-sm/6 wrap-break-word text-muted">
        {item.source === "location" ? (
          fmt(t.jobLocation, { place: item.quote })
        ) : (
          <>
            <span className="sr-only">{t.postSays}</span>“{item.quote}”
          </>
        )}
      </blockquote>
    </li>
  );
}

export function EligibilityCard({ location, text }: EligibilityCardProps) {
  const work = useWorkProfile();
  const hour = Math.floor(useNow() / HOUR_MS) * HOUR_MS;
  const titleId = useId();
  const [editing, setEditing] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const locked = useProTools() === false;
  const tryPro = useTryProLabel();
  const otto = useOtto();
  const t = useMessages("workProfile").card;
  const format = useFormat();
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
      footer = t.loadFailed;
    } else if (work.status === "signed_out") {
      footer = t.signedOut;
    } else if (!started) {
      footer = t.addProfile;
    } else if (gaps) {
      footer = t.gaps;
    }
  }

  let action: ReactNode = null;
  if (work.status === "error" && findings.length > 0) {
    action = (
      <Button variant="secondary" size="sm" onClick={work.retry} className="self-start">
        {t.tryAgain}
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
        {t.signIn}
      </Button>
    );
  } else if (work.status === "ready" && (findings.length > 0 || started)) {
    action = (
      <Button variant="secondary" size="sm" onClick={() => setEditing(true)} className="self-start">
        {started ? t.edit : t.add}
      </Button>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col rounded-2xl bg-surface-muted p-4 sm:p-6"
    >
      <Eyebrow>{t.eyebrow}</Eyebrow>
      <h3 id={titleId} className="mt-2 text-base/6 font-semibold text-ink">
        {t.title}
      </h3>
      {settled && locked ? (
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm/6 text-muted">
            {findings.length === 0 ? null : `${format.plural(t.rules, findings.length)}. `}
            {otto.limit.tool("eligibility", false)}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openUpgradePrompt("eligibility")}
            className="self-start"
          >
            {tryPro}
          </Button>
        </div>
      ) : !settled ? (
        <div className="mt-4 flex flex-col gap-2" aria-hidden>
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : findings.length === 0 ? (
        <p className="mt-1 text-sm/6 text-muted">{t.none}</p>
      ) : (
        <>
          <p className="text-sm/6 text-subtle">
            {format.plural(t.rules, findings.length)}
            {started ? t.checked : null}
          </p>
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {findings.map((item) => (
              <FindingRow key={item.rule} item={item} />
            ))}
          </ul>
        </>
      )}
      {settled && !locked && (footer || action) ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {footer ? <p className="text-sm/6 text-muted">{footer}</p> : null}
          {action}
        </div>
      ) : null}
      {work.status === "ready" ? (
        <LazyWorkProfileDialog
          open={editing}
          onOpenChange={setEditing}
          userId={work.userId}
          profile={work.profile}
          saved={work.updatedAt !== null}
        />
      ) : null}
      <LazySignInDialog open={signingIn} onOpenChange={setSigningIn} reason={t.signInReason} />
    </section>
  );
}
