"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useMe } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { FolderCard } from "@/components/ui/folder-card";
import { Skeleton } from "@/components/ui/skeleton";
import { openLineOnArrival } from "@/components/studio/tailor/jump";
import { lintResume } from "@/lib/lint/bullets";
import { firstWeakLine } from "@/lib/lint/weak-lines";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume } from "@/lib/resume/schema";
import { resetDay, thisPeriod } from "@/lib/usage-copy";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import { pluralize } from "@/lib/utils";
import { CheckArt, FormatsArt, TailorArt } from "./action-art";
import { SkillGapCard } from "./applications/skill-gaps";
import { WinRatePanel } from "./applications/win-rate-panel";
import { groupResumes } from "./group-resumes";
import { recentResumes } from "./library";
import { NewResumeMenu } from "./new-resume-menu";
import { ResumeGrid } from "./resume-grid";
import { StartOptions } from "./start-options";
import { useStudioActions } from "./use-studio-actions";

const RECENT = 3;
const count = new Intl.NumberFormat("en-US");

export function DashboardHome() {
  const hydrated = useStudioHydrated();
  const resumes = useResumeList();
  const { me } = useMe();
  const actions = useStudioActions();
  // The action scenes draw a real page: the newest resume, or the sample until there is one.
  const [sample] = useState(() => createSampleResume(0));
  const groups = useMemo(() => groupResumes(resumes), [resumes]);
  const recent = useMemo(() => recentResumes(resumes, RECENT), [resumes]);
  const lines = useMemo(() => linesToImprove(groups.map((group) => group.resume)), [groups]);
  const firstWeak = lines.first;

  const latest = recent[0] ?? null;
  const pageResume = latest ?? sample;
  const tailoredCount = resumes.filter((resume) => resume.tailor !== null).length;
  const fixes = me?.usage?.fix;
  const tailors = me?.usage?.tailor;

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <div className="flex min-w-0 flex-col gap-5">
          <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
            Welcome back
          </h1>
          <OttoNote
            live={false}
            meta={hydrated ? pluralize(groups.length, "resume") : undefined}
            message={
              !hydrated || latest
                ? "Pick up where you left off, or tailor a resume to a new job."
                : "Upload your resume and I'll show you what hiring software reads."
            }
          />
        </div>
        {/* The sidebar has this on wide screens. */}
        <NewResumeMenu actions={actions} className="lg:hidden" />
      </header>

      <section aria-labelledby="actions-heading" data-tour="dashboard-actions">
        <h2 id="actions-heading" className="sr-only">
          Quick actions
        </h2>
        <ul className="grid gap-x-5 gap-y-8 md:grid-cols-3">
          <ActionCard
            tab="Recruiter view"
            art={<CheckArt resume={pageResume} />}
            title="Check a resume"
            detail="See what hiring software reads from your file."
            onClick={actions.upload}
          />
          <ActionCard
            tab="Tailor"
            art={<TailorArt />}
            title="Tailor to a job"
            detail="Paste a job link. See what it asks for that you haven't shown."
            onClick={() => (latest ? actions.open(latest.id, "tailor") : actions.upload())}
          />
          <ActionCard
            tab="Formats"
            art={<FormatsArt resume={pageResume} />}
            title="Pick a format"
            detail="Six clean looks for one resume. Each reads cleanly."
            href={ROUTES.dashboardFormats}
          />
        </ul>
      </section>

      <FolderCard tab="At a glance" bodyClassName="overflow-hidden p-0">
        {/* Hairlines between the numbers: the 1px gaps let the border color show through. */}
        <dl className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          <Stat
            label="Resumes"
            value={hydrated ? count.format(groups.length) : null}
            note={hydrated ? sourceNote(groups.map((group) => group.resume.source)) : null}
          />
          <Stat
            label="Tailored versions"
            value={hydrated ? count.format(tailoredCount) : null}
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
            value={hydrated ? count.format(lines.total) : null}
            note={
              hydrated
                ? groups.length === 0
                  ? "Nothing to check yet"
                  : lines.total === 0
                    ? "Every line looks good"
                    : `Across ${pluralize(groups.length, "resume")}`
                : null
            }
            // The count opens the editor on the first weak line, with "Fix with Otto" beside it.
            action={
              hydrated && firstWeak
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
                ? fixes.limit === 0
                  ? "Line fixes come with Pro"
                  : me?.period?.kind === "trial"
                    ? `of ${count.format(fixes.limit)} · trial ends ${resetDay(me.period)}`
                    : `of ${count.format(fixes.limit)} · resets on ${resetDay(me?.period)}`
                : null
            }
          />
        </dl>
      </FolderCard>

      <WinRatePanel />
      <SkillGapCard />

      <section aria-labelledby="recent-heading" className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="recent-heading" className="font-sans text-lg/7 font-medium text-ink">
            Recent resumes
          </h2>
          {resumes.length > RECENT ? (
            <Link
              href={ROUTES.dashboardResumes}
              className="group inline-flex items-center gap-1 text-sm font-medium text-ink"
            >
              View all {count.format(resumes.length)}
              <ArrowRight
                aria-hidden
                className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          ) : null}
        </div>
        {!hydrated ? (
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-80 rounded-2xl bg-surface" />
            ))}
          </div>
        ) : latest ? (
          <ResumeGrid resumes={recent} all={resumes} actions={actions} cheer={false} />
        ) : (
          <FolderCard tab="Start here" tone="lavender" bodyClassName="p-5 sm:p-6">
            <p className="text-base/6 font-medium text-ink">Your first resume goes here</p>
            <p className="mt-1 text-sm/6 text-muted">
              Checking and PDF downloads are free. Otto&apos;s AI help comes with Pro.
            </p>
            <div className="mt-4">
              <StartOptions actions={actions} />
            </div>
          </FolderCard>
        )}
      </section>
    </div>
  );
}

// "2 uploaded · 1 sample", in the order people care about.
function sourceNote(sources: readonly string[]): string {
  if (sources.length === 0) return "None yet";
  const labels: [string, string][] = [
    ["import", "uploaded"],
    ["scratch", "from scratch"],
    ["sample", "sample"],
    ["tailored", "tailored"],
  ];
  return labels
    .map(([source, label]) => [sources.filter((item) => item === source).length, label] as const)
    .filter(([total]) => total > 0)
    .map(([total, label]) => `${count.format(total)} ${label}`)
    .join(" · ");
}

type ActionCardProps = {
  tab: string;
  art: ReactNode;
  title: string;
  detail: string;
} & ({ onClick: () => void; href?: never } | { href: string; onClick?: never });

// A folder per job, with Otto doing it on the paper it's about. The title is the real control; its
// ::after stretches over the whole card, so the card is one big target without nesting the folder
// inside a button.
function ActionCard({ tab, art, title, detail, ...target }: ActionCardProps) {
  const control =
    "inline-flex items-center gap-1.5 text-base/6 font-medium text-ink outline-none after:absolute after:inset-0 after:rounded-2xl";
  const label = (
    <>
      {title}
      <ArrowRight
        aria-hidden
        className="size-4 text-muted transition-transform group-hover/action:translate-x-0.5 group-hover/action:text-ink"
      />
    </>
  );
  return (
    <li className="group/action group/otto relative rounded-2xl has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink">
      <FolderCard tab={tab} className="h-full" bodyClassName="flex flex-col p-2">
        {art}
        <div className="px-2 pt-4 pb-2">
          {target.href ? (
            <Link href={target.href} className={control}>
              {label}
            </Link>
          ) : (
            <button type="button" onClick={target.onClick} className={control}>
              {label}
            </button>
          )}
          <p className="mt-1 text-sm/6 text-muted">{detail}</p>
        </div>
      </FolderCard>
    </li>
  );
}

// Lines with something to fix across the resumes, and the first of them, so the count can open it.
function linesToImprove(resumes: readonly Resume[]): {
  total: number;
  first: { resumeId: string; bulletId: string } | null;
} {
  let total = 0;
  let first: { resumeId: string; bulletId: string } | null = null;
  for (const resume of resumes) {
    const { byBullet, totals } = lintResume(resume);
    total += totals.withIssues;
    if (first) continue;
    const bulletId = firstWeakLine(resume, (id) =>
      Object.hasOwn(byBullet, id) ? byBullet[id] : undefined,
    );
    if (bulletId) first = { resumeId: resume.id, bulletId };
  }
  return { total, first };
}

type StatProps = {
  label: string;
  value: string | null;
  note: string | null;
  // Makes the number a button.
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
