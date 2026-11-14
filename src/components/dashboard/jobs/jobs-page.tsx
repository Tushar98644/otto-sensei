"use client";

import { useMemo, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { useSessionUserId } from "@/components/account/session-user";
import { saveLookingForChoice, useWorkProfile } from "@/components/eligibility/use-work-profile";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { JobsWorkPrompt } from "@/components/setup/jobs-work-prompt";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { JobMatchesResponse } from "@/lib/api/types";
import { roleOptions } from "@/lib/job-feed/looking-for";
import {
  DEFAULT_FILTERS,
  MAX_JOB_PAGE,
  NO_CHOICE,
  type JobFilters,
  type LookingForChoice,
} from "@/lib/job-feed/types";
import { resumeTitle } from "@/lib/resume/ops";
import { jobsWorkPromptShows } from "@/lib/setup/checklist";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import { useApplications } from "../applications/use-applications";
import { useStudioActions } from "../use-studio-actions";
import { AppliedAnnouncer, AppliedStrip } from "./applied-question";
import { JobCard } from "./job-card";
import { JobFiltersBar } from "./job-filters";
import {
  JobsHeader,
  JobsPager,
  LoadingCards,
  MoreWithPro,
  NoFilterMatches,
  NoResumeYet,
} from "./jobs-page-parts";
import { LookingForCard } from "./looking-for-card";
import { useJobActions } from "./use-job-actions";
import { useJobMatches, type JobView } from "./use-job-matches";
import { useAppliedPrompts } from "./use-opened-jobs";
import { appliedFor, checkedLabel, defaultResumeId, moreWithProCopy, tailoredFor } from "./view";

const count = new Intl.NumberFormat("en-US");

function sameFilters(a: JobFilters, b: JobFilters): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function JobsPage() {
  const hydrated = useStudioHydrated();
  const resumes = useResumeList();
  const actions = useStudioActions();
  const work = useWorkProfile();
  const userId = useSessionUserId();
  const { items: applications, status: applicationsStatus } = useApplications();
  const now = useNow();
  const listRef = useRef<HTMLDivElement>(null);
  const tryPro = useTryProLabel();
  const pro = useProTools();

  const [picked, setPicked] = useState<string | null>(null);
  const [view, setView] = useState<JobView>("matches");
  const [chosen, setChosen] = useState<JobFilters | null>(null);
  const [page, setPage] = useState(1);
  const [resetKey, setResetKey] = useState(0);

  const resumeId =
    picked && resumes.some((resume) => resume.id === picked) ? picked : defaultResumeId(resumes);
  const resume = resumes.find((item) => item.id === resumeId) ?? null;
  const profileSettled = work.status !== "unknown" && work.status !== "loading";
  const remoteDefault = work.status === "ready" && work.profile.remoteOnly === true;
  const filters = useMemo(
    () => chosen ?? { ...DEFAULT_FILTERS, remote: remoteDefault },
    [chosen, remoteDefault],
  );
  const choice = work.status === "ready" ? work.lookingFor : NO_CHOICE;
  const [savingChoice, setSavingChoice] = useState(false);
  const { state, retry, patch, profile, lookingFor } = useJobMatches({
    userId,
    resume: profileSettled ? resume : null,
    view,
    filters,
    page,
    choice,
    workProfile: work.status === "ready" ? work.profile : null,
  });
  const data: JobMatchesResponse | null =
    state.status === "ready" ? state.data : state.status === "loading" ? state.previous : null;
  const pageJobIds = useMemo(() => data?.jobs.map((job) => job.id) ?? null, [data]);
  const labels = useMemo(
    () =>
      new Map(
        (data?.jobs ?? []).map((job) => {
          const copy = tailoredFor(resumes, job);
          const applied = appliedFor(applications, job);
          return [job.id, { applied, tailoredTitle: copy ? resumeTitle(copy) : null }] as const;
        }),
      ),
    [data, resumes, applications],
  );
  const prompts = useAppliedPrompts({
    userId,
    applications,
    applicationsReady: applicationsStatus === "ready",
    pageJobIds,
    now,
  });
  const { busy, note, tailor, openTailored, toggleSave, markApplied, openJob, answerApplied } =
    useJobActions({ data, view, resume, resumes, applications, userId, patch, actions });

  function changeFilters(next: Partial<JobFilters>) {
    setChosen({ ...filters, ...next });
    setPage(1);
  }

  async function changeLookingFor(next: LookingForChoice) {
    if (work.status !== "ready") return;
    if (chosen) setChosen({ ...chosen, remote: next.remote });
    setPage(1);
    setSavingChoice(true);
    try {
      await saveLookingForChoice(work.userId, next);
    } catch (error) {
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    } finally {
      setSavingChoice(false);
    }
  }

  function goTo(next: number) {
    setPage(next);
    listRef.current?.scrollIntoView({ block: "start" });
  }

  if (hydrated && resumes.length === 0) return <NoResumeYet actions={actions} />;

  const filtered = !sameFilters(filters, { ...DEFAULT_FILTERS, remote: remoteDefault });
  let message: string | null = null;
  if (data) {
    if (data.openJobs === 0) message = OTTO.jobs.noJobs;
    else if (view === "saved") message = OTTO.jobs.saved(data.savedCount);
    else if (data.total === 0 && filtered) message = OTTO.jobs.filtered;
    else if (data.total === 0 && state.status === "ready" && resume && isBare(resume))
      message = OTTO.jobs.noSkills;
    else message = OTTO.jobs.found(data.matching, data.total, data.strong, data.newToday);
  }
  const locked = data?.locked === true;
  if (data && locked && data.openJobs > 0) {
    message = OTTO.jobs.found(data.matching, data.jobs.length, 0, 0);
  }
  const checked = data ? checkedLabel(data.checkedAt, now) : null;
  const meta = data
    ? [`${count.format(data.openJobs)} open jobs`, checked ? `checked ${checked}` : null]
        .filter(Boolean)
        .join(" · ")
    : null;
  const pages = data
    ? Math.min(MAX_JOB_PAGE, Math.max(1, Math.ceil(data.total / data.pageSize)))
    : 1;
  const askingIds = new Set(prompts.onCard.map((entry) => entry.jobId));

  return (
    <div className="flex flex-col gap-8">
      <JobsHeader />

      {message ? <OttoNote message={message} meta={meta} /> : null}

      {lookingFor && profile && view === "matches" ? (
        <LookingForCard
          value={lookingFor}
          occupation={
            data?.lookingFor?.title === lookingFor.title ? (data.occupation ?? null) : null
          }
          choice={choice}
          roles={data?.roles ?? roleOptions(profile).map((role) => ({ ...role, occupation: null }))}
          country={work.status === "ready" ? work.profile.country : ""}
          saving={savingChoice}
          onChange={(next) => void changeLookingFor(next)}
        />
      ) : null}

      {locked ? null : (
        <JobFiltersBar
          key={resetKey}
          resumes={resumes}
          resumeId={resumeId}
          onResume={(id) => {
            setPicked(id);
            setPage(1);
          }}
          view={view}
          onView={(next) => {
            setView(next);
            setPage(1);
          }}
          savedCount={data?.savedCount ?? 0}
          filters={filters}
          onFilters={changeFilters}
          profileReady={data?.profileReady ?? false}
        />
      )}

      {work.status === "ready" && pro === true && data && !locked ? (
        <JobsWorkPrompt
          due={
            view === "matches" &&
            jobsWorkPromptShows({ pro, locked, profile: work.profile })
          }
          userId={work.userId}
          profile={work.profile}
          saved={work.updatedAt !== null}
        />
      ) : null}

      <div ref={listRef} tabIndex={-1} className="flex scroll-mt-24 flex-col gap-4 outline-none">
        <AppliedAnnouncer onCard={prompts.onCard} offPage={prompts.offPage} />
        <AppliedStrip
          jobs={prompts.offPage}
          loggingId={busy?.action === "apply" ? busy.id : null}
          onAnswer={(job, answer) =>
            void answerApplied(
              { id: job.jobId, company: job.company, title: job.title, url: job.url },
              answer,
            )
          }
          focusAfter={listRef}
        />
        <p aria-live="polite" className="sr-only">
          {state.status === "loading"
            ? "Loading jobs"
            : data
              ? `${count.format(data.jobs.length)} of ${count.format(data.total)} jobs shown, page ${data.page} of ${pages}.`
              : ""}
        </p>
        {state.status === "error" ? (
          <Alert
            variant="error"
            title="Jobs didn't load"
            action={
              <Button variant="secondary" size="sm" onClick={retry}>
                Try again
              </Button>
            }
          >
            {errorMessage(state.error)}
          </Alert>
        ) : !data ? (
          <LoadingCards />
        ) : data.jobs.length === 0 ? (
          filtered && view === "matches" ? (
            <NoFilterMatches
              onClear={() => {
                setChosen({ ...DEFAULT_FILTERS, remote: remoteDefault });
                setResetKey((n) => n + 1);
                setPage(1);
              }}
            />
          ) : null
        ) : (
          <ul aria-busy={state.status === "loading"} className="flex flex-col gap-4">
            {data.jobs.map((job) => {
              const label = labels.get(job.id);
              return (
                <JobCard
                  key={job.id}
                  job={job}
                  now={now}
                  applied={label?.applied ?? null}
                  tailoredTitle={label?.tailoredTitle ?? null}
                  logging={busy?.id === job.id && busy.action === "apply"}
                  tailoring={busy?.id === job.id && busy.action === "tailor"}
                  onTailor={(target) => void tailor(target)}
                  onOpenTailored={openTailored}
                  onToggleSave={toggleSave}
                  onMarkApplied={(target) => void markApplied(target)}
                  onOpen={openJob}
                  asking={askingIds.has(job.id)}
                  onAnswer={(target, answer) => void answerApplied(target, answer)}
                  onNotFit={
                    view === "matches"
                      ? (target, reason) => note(target, "not_fit", { reason })
                      : undefined
                  }
                />
              );
            })}
          </ul>
        )}

        {data && locked && data.openJobs > 0 ? (
          <MoreWithPro
            copy={moreWithProCopy(data.jobs.length, data.matching, data.openJobs)}
            tryPro={tryPro}
          />
        ) : null}

        {data && pages > 1 && view === "matches" && !locked ? (
          <JobsPager page={page} pages={pages} onGo={goTo} />
        ) : null}
      </div>
    </div>
  );
}

function isBare(resume: { skills: { items: string[] }[] }): boolean {
  return resume.skills.every((group) => group.items.length === 0);
}
