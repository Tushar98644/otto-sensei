"use client";

import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { useMe } from "@/components/account/use-me";
import { openLineOnArrival } from "@/components/studio/tailor/jump";
import { FolderCard } from "@/components/ui/folder-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { UsagePeriod } from "@/config/plans";
import type { Resume } from "@/lib/resume/schema";
import { resetDay, thisPeriod } from "@/lib/usage-copy";
import { pluralize } from "@/lib/utils";
import { groupResumes } from "../group-resumes";
import type { StudioActions } from "../use-studio-actions";
import { linesToImprove, sourceNote } from "./stats";

const count = new Intl.NumberFormat("en-US");

function resetOn(period: UsagePeriod | null | undefined): string {
  const day = resetDay(period);
  return day ? `on ${day}` : "when your plan renews";
}

// Own resumes only: the sample is a demo, not part of anyone's numbers.
export function AtAGlance({ own, actions }: { own: readonly Resume[]; actions: StudioActions }) {
  const { me } = useMe();
  const groups = useMemo(() => groupResumes(own), [own]);
  const lines = useMemo(() => linesToImprove(groups.map((group) => group.resume)), [groups]);
  const tailoredCount = own.filter((resume) => resume.tailor !== null).length;
  const fixes = me?.usage?.fix;
  const tailors = me?.usage?.tailor;
  const firstWeak = lines.first;

  return (
    <FolderCard tab="At a glance" bodyClassName="overflow-hidden p-0">
      <dl className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        <Stat
          label="Resumes"
          value={count.format(groups.length)}
          note={sourceNote(groups.map((group) => group.resume.source))}
        />
        <Stat
          label="Tailored versions"
          value={count.format(tailoredCount)}
          note={
            tailors
              ? tailors.limit === 0
                ? "Tailoring comes with Pro"
                : `${count.format(tailors.used)} of ${count.format(tailors.limit)} made ${thisPeriod(me?.period)}`
              : null
          }
        />
        <Stat
          label="Lines to improve"
          value={count.format(lines.total)}
          note={lines.total === 0 ? "Every line looks good" : `Across ${pluralize(groups.length, "resume")}`}
          action={
            firstWeak
              ? {
                  label: "Open the first one",
                  onSelect: () => {
                    openLineOnArrival(firstWeak.bulletId);
                    actions.open(firstWeak.resumeId, "fix");
                  },
                }
              : undefined
          }
        />
        <Stat
          label="Line fixes left"
          value={fixes ? count.format(Math.max(0, fixes.limit - fixes.used)) : null}
          note={
            fixes
              ? me?.period?.kind === "trial"
                ? `of ${count.format(fixes.limit)} · trial ends ${resetDay(me.period)}`
                : `of ${count.format(fixes.limit)} · resets ${resetOn(me?.period)}`
              : null
          }
        />
      </dl>
    </FolderCard>
  );
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
