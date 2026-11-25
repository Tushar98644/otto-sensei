"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ROUTES } from "@/components/site/routes";
import { Button } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { useFormat, useMessages } from "@/i18n/client";
import { gapLineText, gapNudgeText } from "./copy";
import { fmt } from "@/i18n/format";
import { MIN_SHORT_JOBS, skillGaps, type SkillGapReport } from "@/lib/insights/skill-gaps";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import { useStudioActions } from "../use-studio-actions";

const PANEL_GAPS = 6;

function useSkillGaps(limit: number): SkillGapReport | null {
  const hydrated = useStudioHydrated();
  const resumes = useResumeList();
  const report = useMemo(() => skillGaps(resumes, limit), [resumes, limit]);
  return hydrated ? report : null;
}

export function SkillGapsPanel() {
  const t = useMessages("applications");
  const { gaps } = t;
  const format = useFormat();
  const report = useSkillGaps(PANEL_GAPS);
  const actions = useStudioActions();
  const resumes = useResumeList();
  const base = resumes.find((resume) => resume.tailor === null) ?? resumes[0] ?? null;
  if (!report) return null;

  return (
    <section aria-labelledby="skill-gaps-heading" className="flex flex-col gap-4">
      <h2 id="skill-gaps-heading" className="font-sans text-lg/7 font-medium text-ink">
        {gaps.heading}
      </h2>
      <FolderCard
        tab={gaps.tab}
        tabEnd={
          report.jobs > 0 ? (
            <span className="text-xs text-subtle tabular-nums">
              {format.plural(t.gaps.fromJobs, report.jobs)}
            </span>
          ) : null
        }
        bodyClassName="px-4 py-0 sm:px-6"
      >
        {report.gaps.length > 0 ? (
          <ul className="divide-y divide-border">
            {report.gaps.map((gap) => {
              const copyId = gap.copyIds[0];
              return (
                <li
                  key={gap.term}
                  className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:gap-6"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-base/6 font-medium text-ink">
                      {gapLineText(gap, report.jobs, t, format)}
                    </p>
                    <p className="mt-1 text-sm/6 text-pretty text-muted">
                      {gapNudgeText(gap, t, format)}
                    </p>
                    {gap.jobs.length > 0 ? (
                      <p className="mt-1 truncate text-xs/5 text-subtle">
                        {fmt(t.gaps.shortIn, { jobs: gap.jobs.join(" · ") })}
                      </p>
                    ) : null}
                  </div>
                  {copyId ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="self-start md:self-auto"
                      onClick={() => actions.open(copyId, "fix")}
                      aria-label={fmt(gaps.addLabel, { term: gap.term })}
                    >
                      {gaps.add}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm/6 text-pretty text-muted">
              {report.jobs < MIN_SHORT_JOBS
                ? fmt(gaps.tailorMore, { count: format.number(MIN_SHORT_JOBS) })
                : fmt(gaps.allShown, { count: format.number(MIN_SHORT_JOBS) })}
            </p>
            {report.jobs < MIN_SHORT_JOBS ? (
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0 self-start sm:self-auto"
                onClick={() => (base ? actions.open(base.id, "tailor") : actions.upload())}
              >
                {base ? gaps.tailor : gaps.upload}
              </Button>
            ) : null}
          </div>
        )}
      </FolderCard>
    </section>
  );
}

export function SkillGapCard() {
  const t = useMessages("applications");
  const { gaps } = t;
  const format = useFormat();
  const report = useSkillGaps(3);
  const top = report?.gaps[0];
  if (!report || !top) return null;
  const more = report.gaps.length - 1;

  return (
    <FolderCard
      tab={gaps.tab}
      tabEnd={
        <Link
          href={ROUTES.dashboardApplications}
          className="group inline-flex items-center gap-1 text-sm font-medium text-ink"
        >
          {more > 0 ? fmt(gaps.more, { count: format.number(more) }) : gaps.applications}
          <ArrowRight
            aria-hidden
            className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      }
      bodyClassName="p-5 sm:p-6"
    >
      <p className="text-base/6 font-medium text-ink">{gapLineText(top, report.jobs, t, format)}</p>
      <p className="mt-1 max-w-prose text-sm/6 text-pretty text-muted">
        {gapNudgeText(top, t, format)}
      </p>
    </FolderCard>
  );
}
