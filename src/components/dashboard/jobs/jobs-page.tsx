"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { useSessionUserId } from "@/components/account/session-user";
import { saveLookingForChoice, useWorkProfile } from "@/components/eligibility/use-work-profile";
import { JobsWorkPrompt } from "@/components/setup/jobs-work-prompt";
import { useSetupGuess } from "@/components/setup/use-account-setup";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { preload, useLazy } from "@/components/ui/lazy";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useFormat, useLocale, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { cn } from "@/lib/utils";
import type { JobMatchesResponse, MatchedJob } from "@/lib/api/types";
import { isProfileStarted } from "@/lib/eligibility/profile";
import { regionNamesFor, searchingLine } from "@/lib/job-feed/looking-for";
import { MAX_JOB_PAGE, NO_CHOICE, type LookingForChoice } from "@/lib/job-feed/types";
import { resumeTitle } from "@/lib/resume/ops";
import { jobsWorkPromptShows } from "@/lib/setup/checklist";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import { useFirstLoadPending } from "@/lib/sync/use-cloud-sync";
import { useApplications } from "../applications/use-applications";
import type { JobsMessages } from "../i18n";
import { jobCards } from "../page-code";
import { LazyOutreachDialog } from "./lazy-outreach-dialog";
import { useStudioActions } from "../use-studio-actions";
import { AppliedAnnouncer, AppliedStrip } from "./applied-question";
import { CLEARED, searchedOrNarrowed, type FilterMemory, type Point } from "./filter-memory";
import { JobFiltersBar, type JobLayout } from "./job-filters";
import { LazyCompanyPanel } from "./lazy-company-panel";
import {
  JobsHeader,
  JobsPager,
  JobsSummary,
  LookingForSkeleton,
  LoadingCards,
  MoreWithPro,
  NoFilterMatches,
  NoResumeYet,
} from "./jobs-page-parts";
import { LookingForCard } from "./looking-for-card";
import { rememberFilters, useFilterMemory } from "./use-filter-memory";
import { useJobActions } from "./use-job-actions";
import { pageFilters, useJobMatches, type JobView } from "./use-job-matches";
import { useAppliedPrompts } from "./use-opened-jobs";
import { useTailorLink } from "./use-tailor-link";
import { appliedFor, checkedLabel, matchingResumeId, moreWithProCopy, tailoredFor } from "./view";

preload(jobCards);

// The map and its library load only when someone opens the map.
const JobsMap = dynamic(() => import("./jobs-map"), {
  ssr: false,
  loading: () => <LoadingCards />,
});

// Otto's line over the matches: how many fit, then how many look strong or are new.
function foundLine(
  { otto }: JobsMessages,
  format: Format,
  matching: number,
  shown: number,
  strong: number,
  newToday: number,
): string {
  const whole = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);
  const n = whole(matching);
  if (n === 0 || whole(shown) === 0) return otto.foundNone;
  const lead =
    n > whole(shown)
      ? fmt(otto.foundMore, { count: format.number(n), shown: format.number(whole(shown)) })
      : format.plural(otto.foundAll, n);
  const s = whole(strong);
  const fresh = whole(newToday);
  const parts = [
    s > 0 ? format.plural(otto.strong, s) : "",
    fresh > 0 ? format.plural(otto.fresh, fresh) : "",
  ].filter(Boolean);
  return parts.length > 0 ? `${lead} ${parts.join(", ")}.` : lead;
}

export function JobsPage() {
  const t = useMessages("jobs");
  const shared = useMessages("jobsShared");
  const locale = useLocale();
  const regionName = useMemo(() => regionNamesFor(locale), [locale]);
  const format = useFormat();
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
  const [layout, setLayout] = useState<JobLayout>("list");
  const [page, setPage] = useState(1);
  // The person's own location, rounded; it stays in this page and is never stored.
  const [point, setPoint] = useState<Point | null>(null);
  const [company, setCompany] = useState<string | null>(null);

  const resumeId = matchingResumeId(resumes, memory.resumeId);
  const resume = resumes.find((item) => item.id === resumeId) ?? null;
  const profileSettled = work.status !== "unknown" && work.status !== "loading";
  const workProfile = work.status === "ready" ? work.profile : null;
  const profileReady = workProfile !== null && isProfileStarted(workProfile);
  const filters = useMemo(
    () => pageFilters(memory, workProfile, point),
    [memory, workProfile, point],
  );
  const choice = work.status === "ready" ? work.lookingFor : NO_CHOICE;
  const [savingChoice, setSavingChoice] = useState(false);
  const { state, retry, patch, profile, lookingFor, body } = useJobMatches({
    userId,
    resume: profileSettled ? resume : null,
    view,
    filters,
    page,
    choice,
    workProfile,
  });
  const mapBody = useMemoBody(body);
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

  function changePoint(next: Point | null) {
    setPoint(next);
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
      toast({ title: t.page.cantSave, description: errorMessage(error), variant: "error" });
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
    if (data.openJobs === 0) message = t.otto.noJobs;
    else if (view === "saved")
      message =
        data.savedCount > 0 ? format.plural(t.otto.saved, data.savedCount) : t.otto.savedNone;
    else if (data.total === 0 && filtered) message = t.otto.filtered;
    else if (data.total === 0 && state.status === "ready" && resume && isBare(resume))
      message = t.otto.noSkills;
    else message = foundLine(t, format, data.matching, data.total, data.strong, data.newToday);
  }
  if (data && locked && data.openJobs > 0) {
    message = foundLine(t, format, data.matching, data.jobs.length, 0, 0);
  }
  // A new choice, filter or page keeps the last list up while it loads, so Otto says what it's reading.
  const refreshing = state.status === "loading" && data !== null && view === "matches";
  const occupation =
    data?.lookingFor?.title === lookingFor?.title ? (data?.occupation?.name ?? null) : null;
  if (refreshing && lookingFor)
    message = searchingLine(lookingFor, occupation, choice.role !== null, shared);
  const checked = data ? checkedLabel(data.checkedAt, now, t, format) : null;
  const meta = data
    ? [
        fmt(t.page.openJobs, { count: format.number(data.openJobs) }),
        checked ? fmt(t.page.checked, { when: checked }) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;
  const pages = data
    ? Math.min(MAX_JOB_PAGE, Math.max(1, Math.ceil(data.total / data.pageSize)))
    : 1;
  const askingIds = new Set(prompts.onCard.map((entry) => entry.jobId));
  const openingOffPage =
    busy?.action === "tailor" && !(data?.jobs.some((job) => job.id === busy.id) ?? false);

  const waiting = !data && state.status !== "error";
  const showMap = layout === "map" && view === "matches" && !locked && !free;
  const lookingForLine =
    lookingFor && profile && view === "matches" ? (
      <LookingForCard
        tone="inset"
        value={lookingFor}
        occupation={
          data?.lookingFor?.title === lookingFor.title ? (data?.occupation ?? null) : null
        }
        choice={choice}
        country={work.status === "ready" ? work.profile.country : ""}
        saving={savingChoice}
        onChange={(next) => void changeLookingFor(next)}
        words={shared}
        regionName={regionName}
      />
    ) : null;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <JobsHeader />

      {/* From the first paint on wider screens, so the filters and list keep their place; a phone's wraps too unevenly to hold. */}
      {message || lookingForLine || waiting ? (
        <JobsSummary
          tab={view === "saved" ? t.page.savedTab : t.page.matchesTab}
          message={message}
          meta={meta}
          loading={waiting}
          busy={refreshing}
          className={waiting ? "max-sm:hidden" : undefined}
        >
          {lookingForLine ?? (waiting && view === "matches" ? <LookingForSkeleton /> : null)}
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
            memory={memory}
            layout={layout}
            onLayout={setLayout}
            point={point}
            onPoint={changePoint}
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
            {t.page.openingInTailor}
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
            ? t.page.loading
            : data
              ? fmt(t.page.shown, {
                  shown: format.number(data.jobs.length),
                  total: format.number(data.total),
                  page: format.number(data.page),
                  pages: format.number(pages),
                })
              : ""}
        </p>
        {state.status === "error" ? (
          <Alert
            variant="error"
            title={t.page.didntLoad}
            action={
              <Button variant="secondary" size="sm" onClick={retry}>
                {t.page.tryAgain}
              </Button>
            }
          >
            {errorMessage(state.error)}
          </Alert>
        ) : showMap && userId ? (
          <JobsMap userId={userId} body={mapBody} onCompany={setCompany} />
        ) : !data || !cards ? (
          <LoadingCards />
        ) : data.jobs.length === 0 ? (
          filtered && view === "matches" ? (
            <NoFilterMatches
              onClear={() => {
                changeFilters(CLEARED);
                setPoint(null);
              }}
            />
          ) : null
        ) : (
          <>
            <h2 className="sr-only">{view === "saved" ? t.page.savedTab : t.page.matchesTab}</h2>
            <ul
              aria-busy={state.status === "loading"}
              className={cn(
                "flex flex-col gap-4 motion-safe:transition-opacity",
                refreshing && "pointer-events-none opacity-50",
              )}
            >
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
                    onCompany={free ? undefined : (target) => setCompany(target.company)}
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
          </>
        )}

        {data && locked && data.openJobs > 0 ? (
          <MoreWithPro
            copy={moreWithProCopy(data.jobs.length, data.matching, data.openJobs, t, format)}
            tryPro={tryPro}
          />
        ) : null}

        {data && pages > 1 && view === "matches" && !locked && !showMap ? (
          <JobsPager page={page} pages={pages} onGo={goTo} />
        ) : null}
      </div>
      {free ? null : <LazyCompanyPanel name={company} onClose={() => setCompany(null)} />}
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

// The map reads the list's own request, without its view and page.
function useMemoBody(body: ReturnType<typeof useJobMatches>["body"]) {
  return useMemo(
    () =>
      body
        ? {
            profile: body.profile,
            filters: body.filters,
            lookingFor: body.lookingFor,
            deviceTimeZone: body.deviceTimeZone,
          }
        : null,
    [body],
  );
}
