"use client";

import { useMemo, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { useSessionUserId } from "@/components/account/session-user";
import { saveLookingForChoice, useWorkProfile } from "@/components/eligibility/use-work-profile";
import { OTTO } from "@/components/mascot/lines";
import { JobsWorkPrompt } from "@/components/setup/jobs-work-prompt";
import { useSetupGuess } from "@/components/setup/use-account-setup";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { lazyModule, useLazy } from "@/components/ui/lazy";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type { JobMatchesResponse, MatchedJob } from "@/lib/api/types";
import { isProfileStarted } from "@/lib/eligibility/profile";
import { roleOptions } from "@/lib/job-feed/looking-for";
import { MAX_JOB_PAGE, NO_CHOICE, type LookingForChoice } from "@/lib/job-feed/types";
import { resumeTitle } from "@/lib/resume/ops";
import { jobsWorkPromptShows } from "@/lib/setup/checklist";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import { useFirstLoadPending } from "@/lib/sync/use-cloud-sync";
import { useApplications } from "../applications/use-applications";
import { LazyOutreachDialog } from "./lazy-outreach-dialog";
import { useStudioActions } from "../use-studio-actions";
import { AppliedAnnouncer, AppliedStrip } from "./applied-question";
import { CLEARED, searchedOrNarrowed, type FilterMemory } from "./filter-memory";
import { JobFiltersBar } from "./job-filters";
import {
  JobsHeader,
  JobsPager,
  JobsSummary,
  LoadingCards,
  MoreWithPro,
  NoFilterMatches,
  NoResumeYet,
  WeeklyJobsPrompt,
} from "./jobs-page-parts";
import { LookingForCard } from "./looking-for-card";
import { rememberFilters, useFilterMemory } from "./use-filter-memory";
import { useJobActions } from "./use-job-actions";
import { pageFilters, useJobMatches, type JobView } from "./use-job-matches";
import { useAppliedPrompts } from "./use-opened-jobs";
import { useTailorLink } from "./use-tailor-link";
import { appliedFor, checkedLabel, matchingResumeId, moreWithProCopy, tailoredFor } from "./view";

// The cards show once the matches are in, so their code downloads beside the page's.
const jobCards = lazyModule(() => import("./job-card"), { preload: true });

const count = new Intl.NumberFormat("en-US");

export function JobsPage() {
  const hydrated = useStudioHydrated();
  const resumes = useResumeList();
  const actions = useStudioActions();
  const work = useWorkProfile();
  const userId = useSessionUserId();
  const loadingResumes = useFirstLoadPending(userId);
  const { items: applications, status: applicationsStatus } = useApplications();
  const now = useNow();
  const cards = useLazy(jobCards, true);
  const listRef = useRef<HTMLDivElement>(null);
  const tryPro = useTryProLabel();
  const pro = useProTools();
  const guess = useSetupGuess();

  const memory = useFilterMemory(userId);
  const [view, setView] = useState<JobView>("matches");
  const [page, setPage] = useState(1);

  const resumeId = matchingResumeId(resumes, memory.resumeId);
  const resume = resumes.find((item) => item.id === resumeId) ?? null;
  const profileSettled = work.status !== "unknown" && work.status !== "loading";
  const workProfile = work.status === "ready" ? work.profile : null;
  const profileReady = workProfile !== null && isProfileStarted(workProfile);
  const filters = useMemo(() => pageFilters(memory, workProfile), [memory, workProfile]);
  const choice = work.status === "ready" ? work.lookingFor : NO_CHOICE;
  const [savingChoice, setSavingChoice] = useState(false);
  const { state, retry, patch, profile, lookingFor } = useJobMatches({
    userId,
    resume: profileSettled ? resume : null,
    view,
    filters,
    page,
    choice,
    workProfile,
  });
  const data: JobMatchesResponse | null =
    state.status === "ready" ? state.data : state.status === "loading" ? state.previous : null;
  const locked = data?.locked === true;
  const free = pro === false || locked;
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
  const {
    busy,
    note,
    tailor,
    tailorById,
    openTailored,
    toggleSave,
    markApplied,
    openJob,
    answerApplied,
  } = useJobActions({ data, view, resume, resumes, applications, userId, patch, actions, free });
  const [outreach, setOutreach] = useState<MatchedJob | null>(null);
  // On a new device the resumes arrive from the cloud after hydration, and the link needs one.
  useTailorLink(hydrated && !loadingResumes, (id) => void tailorById(id));

  function changeFilters(next: Partial<FilterMemory>) {
    rememberFilters(userId, next);
    setPage(1);
  }

  function writeOutreach(job: MatchedJob) {
    if (free) openFeaturePrompt("letter");
    else setOutreach(job);
  }

  async function changeLookingFor(next: LookingForChoice) {
    if (work.status !== "ready") return;
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

  const filtered = !locked && searchedOrNarrowed(filters);
  let message: string | null = null;
  if (data) {
    if (data.openJobs === 0) message = OTTO.jobs.noJobs;
    else if (view === "saved") message = OTTO.jobs.saved(data.savedCount);
    else if (data.total === 0 && filtered) message = OTTO.jobs.filtered;
    else if (data.total === 0 && state.status === "ready" && resume && isBare(resume))
      message = OTTO.jobs.noSkills;
    else message = OTTO.jobs.found(data.matching, data.total, data.strong, data.newToday);
  }
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
  const openingOffPage =
    busy?.action === "tailor" && !(data?.jobs.some((job) => job.id === busy.id) ?? false);

  const lookingForLine =
    lookingFor && profile && view === "matches" ? (
      <LookingForCard
        tone="inset"
        value={lookingFor}
        occupation={data?.lookingFor?.title === lookingFor.title ? (data.occupation ?? null) : null}
        choice={choice}
        roles={data?.roles ?? roleOptions(profile).map((role) => ({ ...role, occupation: null }))}
        country={work.status === "ready" ? work.profile.country : ""}
        saving={savingChoice}
        onChange={(next) => void changeLookingFor(next)}
      />
    ) : null;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <JobsHeader />

      {message || lookingForLine || state.status === "loading" ? (
        <JobsSummary
          tab={view === "saved" ? "Saved jobs" : "Your matches"}
          message={message}
          meta={meta}
          loading={state.status === "loading" && !data}
        >
          {lookingForLine}
        </JobsSummary>
      ) : null}

      <div className="flex flex-col gap-3 empty:hidden">
        {locked ? null : (
          <JobFiltersBar
            resumes={resumes}
            resumeId={resumeId}
            onResume={(id) => changeFilters({ resumeId: id })}
            view={view}
            onView={(next) => {
              setView(next);
              setPage(1);
            }}
            savedCount={data?.savedCount ?? 0}
            filters={filters}
            onFilters={changeFilters}
            onRemote={
              work.status === "ready"
                ? (remote) => void changeLookingFor({ ...choice, remote })
                : null
            }
            profileReady={profileReady}
          />
        )}

        {work.status === "ready" && pro === true && data && !locked ? (
          <JobsWorkPrompt
            due={
              view === "matches" &&
              jobsWorkPromptShows({ pro, locked, profile: work.profile, guess })
            }
            userId={work.userId}
            profile={work.profile}
            saved={work.updatedAt !== null}
          />
        ) : null}
      </div>

      <div ref={listRef} tabIndex={-1} className="flex scroll-mt-24 flex-col gap-4 outline-none">
        {openingOffPage ? (
          <p
            role="status"
            className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-sm/6 text-muted sm:px-6"
          >
            <Spinner />
            Opening that job in Tailor…
          </p>
        ) : null}
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
        ) : !data || !cards ? (
          <LoadingCards />
        ) : data.jobs.length === 0 ? (
          filtered && view === "matches" ? (
            <NoFilterMatches onClear={() => changeFilters(CLEARED)} />
          ) : null
        ) : (
          <ul aria-busy={state.status === "loading"} className="flex flex-col gap-4">
            {data.jobs.map((job, index) => {
              const label = labels.get(job.id);
              return (
                <cards.JobCard
                  key={job.id}
                  index={index}
                  job={job}
                  now={now}
                  applied={label?.applied ?? null}
                  tailoredTitle={label?.tailoredTitle ?? null}
                  logging={busy?.id === job.id && busy.action === "apply"}
                  tailoring={busy?.id === job.id && busy.action === "tailor"}
                  free={free}
                  onTailor={(target) => void tailor(target)}
                  onOpenTailored={openTailored}
                  onToggleSave={toggleSave}
                  onMarkApplied={(target) => void markApplied(target)}
                  onOpen={openJob}
                  onOutreach={writeOutreach}
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

        {userId && data && view === "matches" && data.jobs.length > 0 ? (
          <WeeklyJobsPrompt userId={userId} focusAfter={listRef} />
        ) : null}

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
      {free ? null : (
        <LazyOutreachDialog
          job={outreach}
          resume={outreach ? (tailoredFor(resumes, outreach) ?? resume) : null}
          onClose={() => setOutreach(null)}
        />
      )}
    </div>
  );
}

function isBare(resume: { skills: { items: string[] }[] }): boolean {
  return resume.skills.every((group) => group.items.length === 0);
}
