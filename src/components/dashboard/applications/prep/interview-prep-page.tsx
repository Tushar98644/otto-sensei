"use client";

import { ArrowLeft, Copy, Printer, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { InterviewTicket } from "@/components/dashboard/applications/board/card/interview-ticket";
import { AddToCalendar } from "@/components/dashboard/interview/add-to-calendar";
import { OttoCheer } from "@/components/mascot/otto-cheer";
import { ROUTES } from "@/components/site/routes";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CompanyMark } from "@/components/ui/company-mark";
import { Eyebrow } from "@/components/ui/eyebrow";
import { preload, useLazy } from "@/components/ui/lazy";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api, isApiError } from "@/lib/api/client";
import { applicationHref } from "@/lib/applications/thread";
import type { InterviewPrep, PrepTarget } from "@/lib/insights/prep";
import { countBlanks, prepToText, questionCount } from "@/lib/insights/prep-view";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import type { PrepMessages } from "../../i18n";
import { prepSections } from "../../page-code";
import { useApplications } from "../use-applications";
import { practiceKey } from "./practice-store";
import type { PrepMade } from "./prep-form";
import { PrepPrintStyles } from "./prep-print";

preload(prepSections);

type Load =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; target: PrepTarget; prep: InterviewPrep | null };

type BackLink = { href: string; label: string };

async function copyPack(prep: InterviewPrep, target: PrepTarget, t: PrepMessages) {
  try {
    await navigator.clipboard.writeText(prepToText(prep, target, t));
    toast({ title: t.page.copied, description: t.page.copiedDetail });
  } catch {
    toast({ title: t.page.cantCopy, description: t.page.cantCopyDetail, variant: "error" });
  }
}

export function InterviewPrepPage({
  applicationId,
  back: given,
  autoStart = false,
}: {
  applicationId: string;
  back?: BackLink;
  autoStart?: boolean;
}) {
  const t = useMessages("prep");
  const format = useFormat();
  const back = given ?? { href: ROUTES.dashboardApplications, label: t.page.applications };
  const hydrated = useStudioHydrated();
  const resumes = useResumeList();
  const now = useNow();
  const applications = useApplications();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const parts = useLazy(prepSections, true);
  const [attempt, setAttempt] = useState(0);
  const [remaking, setRemaking] = useState<false | "form" | "paste">(false);
  const [unsaved, setUnsaved] = useState(false);
  const [justMade, setJustMade] = useState(false);
  const [fromTitle, setFromTitle] = useState(false);

  useEffect(() => {
    let live = true;
    api.interviewPrep(applicationId).then(
      ({ target, prep }) => {
        if (live) setLoad({ status: "ready", target, prep });
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

  function retry() {
    setLoad({ status: "loading" });
    setAttempt((count) => count + 1);
  }

  function done({ prep, saved, fromTitle: titleOnly }: PrepMade) {
    setLoad((current) => (current.status === "ready" ? { ...current, prep } : current));
    setRemaking(false);
    setUnsaved(!saved);
    setJustMade(true);
    setFromTitle(titleOnly);
  }

  function remake(mode: "form" | "paste") {
    setRemaking(mode);
    setJustMade(false);
  }

  const target = load.status === "ready" ? load.target : null;
  const prep = load.status === "ready" ? load.prep : null;
  const company = target?.company || prep?.job.company || "";
  const role = target?.role || prep?.job.title || "";
  const tracked = applications.items.find((item) => item.id === applicationId);
  const interviewAt = tracked?.interviewAt ?? null;
  const showPack = target !== null && prep !== null && remaking === false;
  const stats = prep
    ? [
        format.plural(t.count.questions, questionCount(prep)),
        format.plural(t.count.stories, prep.stories.length),
        countBlanks(prep) > 0 ? format.plural(t.count.blanks, countBlanks(prep)) : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div data-prep-print className="flex flex-col gap-8">
      {showPack ? <PrepPrintStyles /> : null}
      <header className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 print:hidden">
          <Link
            href={back.href}
            className="group inline-flex w-fit items-center gap-1 text-sm font-medium text-muted hover:text-ink"
          >
            <ArrowLeft
              aria-hidden
              className="size-4 transition-transform group-hover:-translate-x-0.5"
            />
            {back.label}
          </Link>
          {target && back.href !== applicationHref(applicationId) ? (
            <Link
              href={applicationHref(applicationId)}
              className="text-sm font-medium text-muted underline decoration-border-strong underline-offset-4 hover:text-ink"
            >
              {t.page.wholeApplication}
            </Link>
          ) : null}
        </div>
        <div className="flex items-start gap-4 sm:gap-5">
          {company ? (
            <CompanyMark name={company} size="lg" className="mt-1 motion-safe:animate-fade-in" />
          ) : null}
          <div className="min-w-0 flex-1">
            <Eyebrow>{company ? fmt(t.page.titleAt, { company }) : t.page.title}</Eyebrow>
            <h1 className="mt-2 font-display text-4xl/10 font-normal tracking-tight text-balance text-ink sm:text-5xl/13">
              {role || company || t.page.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
              {interviewAt !== null ? (
                <div className="w-fit min-w-52">
                  <InterviewTicket at={interviewAt} now={now} />
                </div>
              ) : null}
              {stats && showPack ? (
                <p className="text-sm/5 text-muted tabular-nums">{stats}</p>
              ) : null}
            </div>
          </div>
          {justMade && showPack ? <OttoCheer className="hidden sm:block print:hidden" /> : null}
        </div>
        {showPack && target && prep ? (
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {interviewAt !== null ? (
              <AddToCalendar
                interview={{
                  applicationId,
                  company,
                  role,
                  interviewAt,
                  interviewTime: tracked?.interviewTime ?? null,
                  interviewZone: tracked?.interviewZone ?? null,
                }}
                size="sm"
              />
            ) : null}
            <Button variant="secondary" size="sm" onClick={() => void copyPack(prep, target, t)}>
              <Copy aria-hidden />
              {t.page.copyAll}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer aria-hidden />
              {t.page.print}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remake("form")}
              className="text-muted hover:text-ink"
            >
              <RefreshCw aria-hidden />
              {t.page.remake}
            </Button>
          </div>
        ) : null}
      </header>

      {load.status === "loading" || !hydrated || !parts ? (
        <div aria-busy className="flex flex-col">
          <span className="sr-only" role="status">
            {t.page.loading}
          </span>
          <Skeleton aria-hidden className="h-8 w-40 rounded-t-xl rounded-b-none" />
          <Skeleton aria-hidden className="h-64 rounded-2xl rounded-tl-none bg-surface" />
        </div>
      ) : load.status === "missing" ? (
        <Alert
          variant="warn"
          title={t.page.missing}
          action={
            <Link href={back.href} className="text-sm font-medium text-ink underline">
              {fmt(t.page.backTo, { label: back.label })}
            </Link>
          }
        >
          {t.page.missingBody}
        </Alert>
      ) : load.status === "error" ? (
        <Alert
          variant="error"
          title={t.page.didntLoad}
          action={
            <Button variant="secondary" size="sm" onClick={retry}>
              {t.page.tryAgain}
            </Button>
          }
        >
          {load.message}
        </Alert>
      ) : showPack && target && prep ? (
        <>
          {prep.demo || unsaved || fromTitle ? (
            <div className="flex flex-col gap-3 print:hidden">
              {fromTitle ? (
                <Alert
                  variant="info"
                  className="bg-surface"
                  title={t.page.fromTitle}
                  action={
                    <Button variant="secondary" size="sm" onClick={() => remake("paste")}>
                      {t.page.pastePost}
                    </Button>
                  }
                >
                  {t.page.fromTitleBody}
                </Alert>
              ) : null}
              {prep.demo ? (
                <Alert variant="info" className="bg-surface" title={t.page.demo}>
                  {t.page.demoBody}
                </Alert>
              ) : null}
              {unsaved ? (
                <Alert variant="warn" title={t.page.unsaved}>
                  {t.page.unsavedBody}
                </Alert>
              ) : null}
            </div>
          ) : null}
          <parts.PrepPack
            prep={prep}
            target={target}
            storageKey={practiceKey(applicationId, prep.createdAt)}
          />
        </>
      ) : target ? (
        <parts.PrepForm
          target={target}
          resumes={resumes}
          onDone={done}
          onCancel={prep ? () => setRemaking(false) : undefined}
          autoStart={autoStart}
          startPasting={remaking === "paste"}
        />
      ) : null}
    </div>
  );
}
