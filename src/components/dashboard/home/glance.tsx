"use client";

import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { useMe } from "@/components/account/use-me";
import { openLineOnArrival } from "@/components/studio/tailor/jump";
import { FolderCard } from "@/components/ui/folder-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { UsagePeriod } from "@/config/plans";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Resume } from "@/lib/resume/schema";
import { groupResumes } from "../group-resumes";
import type { DashboardMessages } from "../i18n";
import type { StudioActions } from "../use-studio-actions";
import { linesToImprove, sourceNote } from "./stats";

const SHORT_DAY = { month: "short", day: "numeric" } as const;

function resetDay(format: Format, period: UsagePeriod | null | undefined): string | null {
  return period ? format.date(period.resetsAt, SHORT_DAY) : null;
}

// Own resumes only: the sample is a demo, not part of anyone's numbers.
export function AtAGlance({ own, actions }: { own: readonly Resume[]; actions: StudioActions }) {
  const t = useMessages("dashboard");
  const { glance } = t;
  const format = useFormat();
  const { me } = useMe();
  const groups = useMemo(() => groupResumes(own), [own]);
  const lines = useMemo(() => linesToImprove(groups.map((group) => group.resume)), [groups]);
  const tailoredCount = own.filter((resume) => resume.tailor !== null).length;
  const fixes = me?.usage?.fix;
  const tailors = me?.usage?.tailor;
  const firstWeak = lines.first;

  return (
    <FolderCard tab={glance.tab} bodyClassName="overflow-hidden p-0">
      <dl className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        <Stat
          label={glance.resumes}
          value={format.number(groups.length)}
          note={sourceNote(
            groups.map((group) => group.resume.source),
            t,
            format,
          )}
        />
        <Stat
          label={glance.tailored}
          value={format.number(tailoredCount)}
          note={
            tailors
              ? tailors.limit === 0
                ? glance.tailoringPro
                : fmt(me?.period?.kind === "trial" ? glance.madeThisTrial : glance.madeThisMonth, {
                    used: format.number(tailors.used),
                    limit: format.number(tailors.limit),
                  })
              : null
          }
        />
        <Stat
          label={glance.lines}
          value={format.number(lines.total)}
          note={lines.total === 0 ? glance.allGood : format.plural(glance.across, groups.length)}
          action={
            firstWeak
              ? {
                  label: glance.openFirst,
                  onSelect: () => {
                    openLineOnArrival(firstWeak.bulletId);
                    actions.open(firstWeak.resumeId, "fix");
                  },
                }
              : undefined
          }
        />
        <Stat
          label={glance.fixesLeft}
          value={fixes ? format.number(Math.max(0, fixes.limit - fixes.used)) : null}
          note={fixes ? fixesNote(format, glance, fixes.limit, me?.period) : null}
        />
      </dl>
    </FolderCard>
  );
}

function fixesNote(
  format: Format,
  glance: DashboardMessages["glance"],
  limit: number,
  period: UsagePeriod | null | undefined,
): string {
  const values = { limit: format.number(limit) };
  const day = resetDay(format, period);
  if (period?.kind === "trial") return fmt(glance.trialEnds, { ...values, day: day ?? "" });
  return day ? fmt(glance.resetsOn, { ...values, day }) : fmt(glance.resetsRenew, values);
}

type StatProps = {
  label: string;
  value: string | null;
  note: string | null;
  action?: { label: string; onSelect: () => void };
};

function Stat({ label, value, note, action }: StatProps) {
  return (
    <div className="flex flex-col bg-surface p-5 sm:p-6">
      <dt className="text-sm/5 text-muted">{label}</dt>
      <dd className="mt-2 font-display text-4xl/10 font-normal text-ink lining-nums tabular-nums">
        {value === null ? (
          <Skeleton className="h-10 w-16" />
        ) : action ? (
          <button
            type="button"
            onClick={action.onSelect}
            className="group/stat inline-flex items-center gap-2 rounded-lg underline decoration-border-strong decoration-2 underline-offset-8 transition-colors hover:decoration-ink"
          >
            {value}
            <ArrowRight
              aria-hidden
              className="size-5 text-muted transition-transform group-hover/stat:translate-x-0.5 group-hover/stat:text-ink"
            />
            <span className="sr-only">{`${label.toLowerCase()}. ${action.label}`}</span>
          </button>
        ) : (
          value
        )}
      </dd>
      <dd className="mt-1 min-h-5 text-xs/5 text-subtle">{note ?? null}</dd>
    </div>
  );
}
