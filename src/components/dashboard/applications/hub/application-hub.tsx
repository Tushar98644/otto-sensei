"use client";

import { ArrowLeft, PartyPopper, PenLine, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useProTools } from "@/components/account/pro-tools";
import { LazyCareerLogOffer } from "@/components/career-log/lazy-offer";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api, isApiError } from "@/lib/api/client";
import type { Application } from "@/lib/applications/schema";
import { followsUp } from "@/lib/applications/follow-up";
import { nextStep, type ApplicationStatus } from "@/lib/applications/status";
import { copyLetter, type ApplicationThread } from "@/lib/applications/thread";
import { savedJobText } from "@/lib/insights/saved-job";
import { WRITE_PARAM } from "@/lib/notifications/links";
import { resumeTitle } from "@/lib/resume/ops";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import type { Writing } from "@/lib/writings/schema";
import type { OutreachJob } from "../../jobs/outreach-saved";
import { LazyOutreachDialog } from "../../jobs/lazy-outreach-dialog";
import { LazyWriteDialog } from "../../letters/lazy-write-dialog";
import { LazyApplicationDialog } from "../lazy-application-dialog";
import { defaultResume } from "../../letters/entries";
import { useStudioActions } from "../../use-studio-actions";
import type { ApplicationDialogTarget } from "../application-dialog";
import { FollowUpChip } from "../follow-up-chip";
import { StatusMenu } from "../status-menu";
import {
  changeApplication,
  commitDelete,
  hideApplication,
  restoreApplication,
  useApplications,
} from "../use-applications";
import { formatDay } from "../../i18n";
import { sentLine } from "../copy";
import { useStatusMenuCopy } from "../use-status-copy";
import { prepHref } from "../view";
import { hubLetters, hubTally, LettersCard, withWriting } from "./hub-letters";
import { JobCard, NotesCard, PrepCard, ResumeSentCard, TimelineCard } from "./hub-sections";
import { nextStepLine, timelineSteps } from "./timeline";

type Load =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; thread: ApplicationThread };

function dropWriteParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(WRITE_PARAM)) return;
  url.searchParams.delete(WRITE_PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

// thankYou: opened from "Write a thank-you" in the bell or the morning email, so the writer opens on it.
export function ApplicationHub({
  applicationId,
  thankYou = false,
}: {
  applicationId: string;
  thankYou?: boolean;
}) {
  const t = useMessages("applications");
  const { hub } = t;
  const format = useFormat();
  const statusCopy = useStatusMenuCopy();
  const router = useRouter();
  const now = useNow();
  const hydrated = useStudioHydrated();
  const resumes = useResumeList();
  const actions = useStudioActions();
  const pro = useProTools();
  const { items } = useApplications();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [dialog, setDialog] = useState<ApplicationDialogTarget | null>(null);
  const [writing, setWriting] = useState<{ key: number; open: boolean } | null>(null);
  const [outreach, setOutreach] = useState<OutreachJob | null>(null);
  const [hired, setHired] = useState(false);

  useEffect(() => {
    let live = true;
    api.applicationThread(applicationId).then(
      ({ thread }) => {
        if (live) setLoad({ status: "ready", thread });
      },
      (error: unknown) => {
        if (!live) return;
        setLoad(
          isApiError(error, "not_found")
            ? { status: "missing" }
            : { status: "error", message: errorMessage(error) },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [applicationId, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  // An outreach message shows here as soon as it saves, and again after each edit.
  const keepWriting = useCallback((writing: Writing) => {
    setLoad((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            thread: { ...current.thread, writings: withWriting(current.thread.writings, writing) },
          }
        : current,
    );
  }, []);

  const thread = load.status === "ready" ? load.thread : null;
  const application: Application | null =
    items.find((item) => item.id === applicationId) ?? thread?.application ?? null;
  const sent = useMemo(
    () =>
      application?.resumeId
        ? (resumes.find((resume) => resume.id === application.resumeId) ?? null)
        : null,
    [application?.resumeId, resumes],
  );
  const copy = sent?.tailor ? sent : null;
  const letters = useMemo(
    () => (thread ? hubLetters(thread.writings, copy, copyLetter(copy)) : []),
    [thread, copy],
  );
  const steps = useMemo(
    () => (application && thread ? timelineSteps(application, thread.history) : []),
    [application, thread],
  );

  function setStatus(target: Application, status: ApplicationStatus) {
    changeApplication(target, { status }).then(
      () => {
        reload();
        if (status === "interview" && !target.hasPrep) {
          toast({
            title: hub.movedInterview,
            description: target.company,
            durationMs: 8000,
            action: {
              label: pro === false ? hub.prepareActionPro : hub.prepareAction,
              onAction: () => prepare(target),
            },
          });
        }
      },
      (error: unknown) =>
        toast({ title: hub.cantChange, description: errorMessage(error), variant: "error" }),
    );
  }

  function prepare(target: Application) {
    if (pro === false) openFeaturePrompt("letter");
    else router.push(prepHref(target.id));
  }

  function write() {
    if (pro === false) {
      openFeaturePrompt("letter");
      return;
    }
    setWriting((current) => ({ key: (current?.key ?? 0) + 1, open: true }));
  }

  // A kept message opens on any plan; only writing one takes Pro.
  function writeOutreach(kind: "message" | "thank_you" = "message") {
    const thanking = kind === "thank_you";
    if (pro === false && (thanking || !letters.some((letter) => letter.kind === "outreach"))) {
      openFeaturePrompt("letter");
      return;
    }
    if (!application) return;
    setOutreach({
      id: thread?.job?.id ?? null,
      title: thread?.job?.title || application.role,
      company: thread?.job?.company || application.company,
      url: thread?.job?.url || application.jobUrl,
      applicationId: application.id,
      post: savedJobText(copy),
      ...(thanking ? { thankYou: true as const } : {}),
    });
  }

  // Once, when the page and the plan are known; the link's ?write= goes so a reload doesn't reopen it.
  const thanked = useRef(false);
  useEffect(() => {
    if (!thankYou || thanked.current || load.status !== "ready" || pro === null) return;
    thanked.current = true;
    dropWriteParam();
    writeOutreach("thank_you");
  });

  function remove(target: Application) {
    hideApplication(target);
    router.push(ROUTES.dashboardApplications);
    undoToast({
      title: hub.deleted,
      description: target.company,
      onUndo: () => {
        restoreApplication(target);
        router.push(`${ROUTES.dashboardApplications}/${encodeURIComponent(target.id)}`);
      },
      onCommit: (options) => {
        commitDelete(target, options).catch((error: unknown) =>
          toast({ title: hub.cantDelete, description: errorMessage(error), variant: "error" }),
        );
      },
    });
  }

  const next = application ? nextStep(application.status) : null;
  const titles = useMemo(
    () => new Map(resumes.map((resume) => [resume.id, { title: resumeTitle(resume) }])),
    [resumes],
  );
  const facts = application
    ? [
        t.statuses[application.status],
        letters.length > 0 ? hubTally(letters, t, format) : null,
        thread?.prep ? hub.prepReady : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <Link
          href={ROUTES.dashboardApplications}
          className="group inline-flex w-fit items-center gap-1 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft
            aria-hidden
            className="size-4 transition-transform group-hover:-translate-x-0.5"
          />
          {hub.back}
        </Link>
        {application ? (
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <h1 className="font-display text-4xl/10 font-normal tracking-tight text-pretty text-ink sm:text-5xl/13">
                {application.company}
              </h1>
              <p className="mt-2 max-w-prose text-base/7 text-muted">
                {[
                  application.role,
                  fmt(hub.applied, {
                    day: formatDay(format, application.appliedAt, now || application.appliedAt),
                  }),
                  application.interviewAt
                    ? fmt(hub.interview, {
                        day: formatDay(
                          format,
                          application.interviewAt,
                          now || application.interviewAt,
                        ),
                      })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-1 text-sm/5 text-subtle">
                {fmt(hub.sent, { sent: sentLine(application, titles, t) })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusMenu
                application={application}
                onChange={(status) => setStatus(application, status)}
                copy={statusCopy}
              />
              {next ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatus(application, next.status)}
                >
                  {application.status === "applied" || application.status === "interview"
                    ? t.next[application.status]
                    : next.label}
                </Button>
              ) : application.status === "offer" && !hired ? (
                <Button variant="ghost" size="sm" onClick={() => setHired(true)}>
                  <PartyPopper aria-hidden />
                  {hub.gotJob}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>

      {load.status === "loading" || !hydrated ? (
        <div aria-busy className="flex flex-col gap-6">
          <span className="sr-only" role="status">
            {hub.loading}
          </span>
          <Skeleton aria-hidden className="h-12 w-72 max-w-full" />
          <div aria-hidden className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-2xl bg-surface lg:col-span-2" />
            <Skeleton className="h-72 rounded-2xl bg-surface" />
          </div>
        </div>
      ) : load.status === "missing" ? (
        <Alert
          variant="warn"
          title={hub.missing}
          action={
            <Link
              href={ROUTES.dashboardApplications}
              className="text-sm font-medium text-ink underline"
            >
              {hub.backTo}
            </Link>
          }
        >
          {hub.missingBody}
        </Alert>
      ) : load.status === "error" ? (
        <Alert
          variant="error"
          title={hub.didntLoad}
          action={
            <Button variant="secondary" size="sm" onClick={reload}>
              {hub.tryAgain}
            </Button>
          }
        >
          {load.message}
        </Alert>
      ) : thread && application ? (
        <>
          <LazyCareerLogOffer
            moment={application.status === "offer"}
            hired={hired}
            job={{ role: application.role, company: application.company }}
          />
          <OttoNote
            live={false}
            meta={facts}
            message={nextStepLine(application, thread.prep !== null, now, t, format)}
          >
            {followsUp(application.status) ? (
              <FollowUpChip application={application} now={now} />
            ) : null}
          </OttoNote>

          <div className="grid items-start gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <TimelineCard steps={steps} now={now} />
              <PrepCard
                application={application}
                prep={thread.prep}
                now={now}
                pro={pro}
                onPrepare={() => prepare(application)}
              />
              <LettersCard
                letters={letters}
                now={now}
                pro={pro}
                onWrite={write}
                onOutreach={() => writeOutreach()}
              />
              <NotesCard
                notes={application.notes}
                onEdit={() => setDialog({ kind: "edit", application })}
              />
            </div>
            <div className="flex flex-col gap-6 max-lg:order-first">
              <JobCard
                application={application}
                job={thread.job}
                now={now}
                onEdit={() => setDialog({ kind: "edit", application })}
              />
              <ResumeSentCard application={application} sent={sent} onOpen={actions.open} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialog({ kind: "edit", application })}
            >
              <PenLine aria-hidden />
              {hub.edit}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-fail-ink hover:bg-fail-soft"
              onClick={() => remove(application)}
            >
              <Trash2 aria-hidden className="text-fail" />
              {hub.delete}
            </Button>
          </div>
        </>
      ) : null}

      {pro === false && outreach === null ? null : (
        <LazyOutreachDialog
          job={outreach}
          resume={outreach ? (sent ?? defaultResume(resumes)) : null}
          onClose={() => setOutreach(null)}
          onSaved={keepWriting}
        />
      )}
      <LazyApplicationDialog
        target={dialog}
        resumes={resumes}
        onClose={() => {
          setDialog(null);
          reload();
        }}
      />
      {/* Free accounts can't write here, so they skip loading the dialog's code. */}
      {pro === false && writing === null ? null : (
        <LazyWriteDialog
          key={writing?.key}
          kind="letter"
          open={writing !== null && writing.open && application !== null}
          resumes={resumes}
          start={
            application
              ? {
                  applicationId: application.id,
                  resumeId: sent?.id ?? null,
                  draft: {
                    title: application.role,
                    company: application.company,
                    link: thread?.job?.url || application.jobUrl,
                    text: savedJobText(copy),
                    paste: savedJobText(copy) !== "",
                  },
                }
              : undefined
          }
          onClose={() => setWriting((current) => current && { ...current, open: false })}
          onWritten={(written) => {
            setWriting((current) => current && { ...current, open: false });
            if (written.kind === "saved") {
              reload();
              toast({ title: hub.letterKept, variant: "success" });
            }
          }}
        />
      )}
    </div>
  );
}
