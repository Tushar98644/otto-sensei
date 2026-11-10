"use client";

import { Lock } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useTryProLabel } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { storeLookingFor, useWorkProfile } from "@/components/eligibility/use-work-profile";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { useNow } from "@/components/studio/use-now";
import { queueJobForTailor } from "@/components/studio/tailor/session";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { api } from "@/lib/api/client";
import type { JobMatchesResponse, MatchActionInput, MatchedJob } from "@/lib/api/types";
import { roleOptions } from "@/lib/job-feed/looking-for";
import {
  DEFAULT_FILTERS,
  MAX_JOB_PAGE,
  NO_CHOICE,
  type JobFilters,
  type LookingForChoice,
  type NotFitReason,
} from "@/lib/job-feed/types";
import { resumeTitle } from "@/lib/resume/ops";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import { commitDelete, hideApplication, useApplications } from "../applications/use-applications";
import { formatDay } from "../applications/view";
import { NewResumeMenu } from "../new-resume-menu";
import { useStudioActions } from "../use-studio-actions";
import { logJobApplied } from "./job-actions";
import { JobCard } from "./job-card";
import { JobFiltersBar } from "./job-filters";
import { LookingForCard } from "./looking-for-card";
import { useJobMatches, type JobView } from "./use-job-matches";
import {
  appliedFor,
  checkedLabel,
  defaultResumeId,
  moreWithProCopy,
  readsLink,
  tailoredFor,
} from "./view";

const count = new Intl.NumberFormat("en-US");

function sameFilters(a: JobFilters, b: JobFilters): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// The Jobs tab: open jobs from public boards ranked for one resume, each one click from a tailored
// copy and the tracker. Free sees its closest few matches (FREE_JOB_MATCHES) and how many more
// there are, with the trial prompt; filters, paging and saving are Pro.
export function JobsPage() {
  const hydrated = useStudioHydrated();
  const resumes = useResumeList();
  const actions = useStudioActions();
  const work = useWorkProfile();
  const { items: applications } = useApplications();
  const now = useNow();
  const listRef = useRef<HTMLDivElement>(null);
  const tryPro = useTryProLabel();

  const [picked, setPicked] = useState<string | null>(null);
  const [view, setView] = useState<JobView>("matches");
  // null until the person changes a filter: until then "Remote only" follows the work profile.
  const [chosen, setChosen] = useState<JobFilters | null>(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<{ id: string; action: "save" | "apply" | "tailor" } | null>(
    null,
  );
  // Bumped by "Clear filters", so the typed fields start over too.
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
  // Waits for the work profile, so a remote-only default doesn't cost a second request.
  const { state, retry, patch, profile, lookingFor } = useJobMatches({
    resume: profileSettled ? resume : null,
    view,
    filters,
    page,
    choice,
    workProfile: work.status === "ready" ? work.profile : null,
  });
  const data: JobMatchesResponse | null =
    state.status === "ready" ? state.data : state.status === "loading" ? state.previous : null;

  function changeFilters(next: Partial<JobFilters>) {
    setChosen({ ...filters, ...next });
    setPage(1);
  }

  // Shown at once and ranked for; kept for the account in the background.
  async function changeLookingFor(next: LookingForChoice) {
    if (work.status !== "ready") return;
    const before = work.lookingFor;
    storeLookingFor(work.userId, next);
    // The filter bar's "Remote only" follows the card's.
    if (chosen) setChosen({ ...chosen, remote: next.remote });
    setPage(1);
    setSavingChoice(true);
    try {
      const res = await api.saveLookingFor(next);
      storeLookingFor(work.userId, res.choice);
    } catch (error) {
      storeLookingFor(work.userId, before);
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    } finally {
      setSavingChoice(false);
    }
  }

  function goTo(next: number) {
    setPage(next);
    listRef.current?.scrollIntoView({ block: "start" });
  }

  // Noted for measuring match quality; a lost note never gets in the person's way.
  function note(
    job: MatchedJob,
    kind: MatchActionInput["kind"],
    reason: NotFitReason | null = null,
  ) {
    if (!data || view !== "matches") return;
    void api
      .jobEvent({
        kind,
        jobId: job.id,
        requestId: data.requestId,
        position: job.position,
        label: job.match.label,
        variant: data.variant,
        resumeHash: data.resumeHash,
        reason,
      })
      .catch(() => undefined);
  }

  async function tailor(job: MatchedJob) {
    if (!resume) return;
    note(job, "tailor");
    setBusy({ id: job.id, action: "tailor" });
    let text = "";
    try {
      // The post as the server read it from the board's own API (or the text a feed's job
      // keeps): the Tailor step's backup when the job's link can't be read.
      text = (await api.jobPost(job.id)).text;
    } catch {
      // The link alone still works for the boards; the feeds' jobs need their text.
      if (!readsLink(job)) {
        setBusy(null);
        toast({
          title: "Couldn't open that job",
          description: "Try again in a moment.",
          variant: "error",
        });
        return;
      }
    }
    queueJobForTailor({
      link: job.url,
      title: job.title,
      company: job.company,
      location: job.location,
      text,
      postedAt: job.postedAt,
      readLink: readsLink(job),
      jobId: job.id,
    });
    actions.open(resume.id, "tailor");
  }

  function openTailored(job: MatchedJob) {
    const copy = tailoredFor(resumes, job);
    if (copy) actions.open(copy.id, "fix");
  }

  async function toggleSave(job: MatchedJob) {
    // Saving is Pro: Free gets the trial prompt instead of a failed request.
    if (data?.locked && !job.saved) {
      openUpgradePrompt("jobs");
      return;
    }
    setBusy({ id: job.id, action: "save" });
    try {
      const res = job.saved ? await api.unsaveJob(job.id) : await api.saveJob(job.id);
      if (res.saved) note(job, "save");
      patch((current) => ({
        ...current,
        savedCount: res.savedCount,
        jobs:
          view === "saved" && !res.saved
            ? current.jobs.filter((item) => item.id !== job.id)
            : current.jobs.map((item) =>
                item.id === job.id ? { ...item, saved: res.saved } : item,
              ),
      }));
    } catch (error) {
      toast({
        title: job.saved ? "Couldn't remove it" : "Couldn't save it",
        description: errorMessage(error),
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  // One click logs it as sent today, with the tailored copy for this job when there is one, and
  // the usual follow-up reminder.
  async function markApplied(job: MatchedJob) {
    const sent = tailoredFor(resumes, job) ?? resume;
    setBusy({ id: job.id, action: "apply" });
    try {
      const application = await logJobApplied(job, sent);
      note(job, "applied");
      undoToast({
        title: `Marked as applied at ${application.company}`,
        description:
          application.followUpAt === null
            ? undefined
            : `I'll remind you to follow up on ${formatDay(application.followUpAt, application.followUpAt)}.`,
        onUndo: () => {
          hideApplication(application);
          commitDelete(application, { keepalive: false }).catch((error: unknown) =>
            toast({
              title: "Couldn't undo that",
              description: errorMessage(error),
              variant: "error",
            }),
          );
        },
      });
    } catch (error) {
      toast({ title: "Couldn't log it", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  if (hydrated && resumes.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <JobsHeader />
        <section
          aria-labelledby="jobs-empty"
          className="flex flex-col items-center rounded-3xl bg-surface px-6 py-14 text-center sm:py-20"
        >
          <Otto pose="read" size={128} />
          <h2 id="jobs-empty" className="mt-6 font-sans text-lg/7 font-medium text-ink">
            Jobs that fit your resume will show up here
          </h2>
          <p className="mt-2 max-w-sm text-sm/6 text-pretty text-muted">{OTTO.jobs.noResume}</p>
          <div className="mt-6">
            <NewResumeMenu actions={actions} />
          </div>
        </section>
      </div>
    );
  }

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
  // Free: the closest few from the same ranking, then how many more Pro lists.
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

  return (
    <div className="flex flex-col gap-8">
      <JobsHeader />

      {message ? <OttoNote message={message} meta={meta} /> : null}

      {lookingFor && profile && view === "matches" ? (
        <LookingForCard
          value={lookingFor}
          // The occupation is read on our server; until the first list arrives the card shows
          // the title alone.
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

      <div ref={listRef} className="flex scroll-mt-24 flex-col gap-4">
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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-5 sm:px-6">
              <p className="text-sm/6 text-muted">No jobs match these filters.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setChosen({ ...DEFAULT_FILTERS, remote: remoteDefault });
                  setResetKey((n) => n + 1);
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : null
        ) : (
          <ul aria-busy={state.status === "loading"} className="flex flex-col gap-4">
            {data.jobs.map((job) => {
              const copy = tailoredFor(resumes, job);
              return (
                <JobCard
                  key={job.id}
                  job={job}
                  now={now}
                  applied={appliedFor(applications, job)}
                  tailoredTitle={copy ? resumeTitle(copy) : null}
                  saving={busy?.id === job.id && busy.action === "save"}
                  logging={busy?.id === job.id && busy.action === "apply"}
                  tailoring={busy?.id === job.id && busy.action === "tailor"}
                  onTailor={(target) => void tailor(target)}
                  onOpenTailored={openTailored}
                  onToggleSave={(target) => void toggleSave(target)}
                  onMarkApplied={(target) => void markApplied(target)}
                  onOpen={(target) => note(target, "open")}
                  onNotFit={
                    view === "matches"
                      ? (target, reason) => note(target, "not_fit", reason)
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
          <nav aria-label="Pages" className="flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => goTo(page - 1)}
            >
              Previous
            </Button>
            <p className="text-sm text-subtle tabular-nums">
              Page {page} of {pages}
            </p>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pages}
              onClick={() => goTo(page + 1)}
            >
              Next
            </Button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

// No skills section and no lines naming a tool: matching has nothing to go on but the titles.
function isBare(resume: { skills: { items: string[] }[] }): boolean {
  return resume.skills.every((group) => group.items.length === 0);
}

function JobsHeader() {
  return (
    <header className="min-w-0">
      <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
        Jobs
      </h1>
      <p className="mt-2 max-w-prose text-base/7 text-muted">
        Open jobs from company job boards and remote job sites, ordered by how closely each post
        matches your resume. Each one links to the original post.
      </p>
    </header>
  );
}

function LoadingCards() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading jobs
      </span>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          aria-hidden
          className="flex flex-col gap-3 rounded-2xl bg-surface p-4 sm:p-6"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-64 max-w-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Free, under its closest few: faded card shapes say the list goes on, then the real numbers and
// the trial. The shapes are plain bars, never made-up jobs.
function MoreWithPro({ copy, tryPro }: { copy: { title: string; body: string }; tryPro: string }) {
  return (
    <section aria-labelledby="jobs-more" className="relative flex flex-col">
      <div
        aria-hidden
        className="flex flex-col gap-4 [mask-image:linear-gradient(to_bottom,black,transparent)]"
      >
        {[0, 1].map((index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-2xl bg-surface p-4 opacity-70 sm:p-6"
          >
            <div className="h-4 w-32 rounded-full bg-surface-muted" />
            <div className="h-5 w-64 max-w-full rounded-full bg-surface-muted" />
            <div className="h-4 w-48 rounded-full bg-surface-muted" />
          </div>
        ))}
      </div>
      <div className="-mt-16 flex flex-col items-start gap-4 rounded-2xl bg-surface px-4 py-6 shadow-sm ring-1 ring-border sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 gap-3">
          <Lock className="mt-1 size-4 shrink-0 text-subtle" aria-hidden />
          <div className="min-w-0">
            <h2 id="jobs-more" className="text-base/6 font-medium text-ink">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm/6 text-pretty text-muted">{copy.body}</p>
          </div>
        </div>
        <Button onClick={() => openUpgradePrompt("jobs")} className="shrink-0">
          {tryPro}
        </Button>
      </div>
    </section>
  );
}
