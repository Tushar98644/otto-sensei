"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { OttoCheer } from "@/components/mascot/otto-cheer";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, isApiError } from "@/lib/api/client";
import { applicationHref } from "@/lib/applications/thread";
import type { InterviewPrep, PrepTarget } from "@/lib/insights/prep";
import { countBlanks } from "@/lib/insights/prep-view";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import { pluralize } from "@/lib/utils";
import { PrepForm } from "./prep-form";
import { PrepPack } from "./prep-pack";

type Load =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; target: PrepTarget; prep: InterviewPrep | null };

type BackLink = { href: string; label: string };

const TO_APPLICATIONS: BackLink = { href: ROUTES.dashboardApplications, label: "Applications" };

// back: where the page was reached from, Applications or Interview prep.
export function InterviewPrepPage({
  applicationId,
  back = TO_APPLICATIONS,
}: {
  applicationId: string;
  back?: BackLink;
}) {
  const hydrated = useStudioHydrated();
  const resumes = useResumeList();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  // Over a saved pack, the form shows with a way back to it; the saved one stays until replaced.
  const [remaking, setRemaking] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  // Just made on this visit, not opened from before: Otto cheers once.
  const [justMade, setJustMade] = useState(false);

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

  function done(prep: InterviewPrep, saved: boolean) {
    setLoad((current) => (current.status === "ready" ? { ...current, prep } : current));
    setRemaking(false);
    setUnsaved(!saved);
    setJustMade(true);
  }

  const target = load.status === "ready" ? load.target : null;
  const prep = load.status === "ready" ? load.prep : null;
  const role = target ? [target.role, target.company].filter(Boolean).join(" at ") : "";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={back.href}
            className="group inline-flex w-fit items-center gap-1 text-sm font-medium text-muted hover:text-ink"
          >
            <ArrowLeft aria-hidden className="size-4 transition-transform group-hover:-translate-x-0.5" />
            {back.label}
          </Link>
          {/* The whole thread (job, resume sent, letters, timeline) is one link away. */}
          {target && back.href !== applicationHref(applicationId) ? (
            <Link
              href={applicationHref(applicationId)}
              className="text-sm font-medium text-muted underline decoration-border-strong underline-offset-4 hover:text-ink"
            >
              See the whole application
            </Link>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-0">
            <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
              Interview prep
            </h1>
            <p className="mt-2 max-w-prose text-base/7 text-muted">
              {role || "Your interview, round by round, with stories from your own lines."}
            </p>
          </div>
          {justMade && prep && !remaking ? <OttoCheer /> : null}
        </div>
      </header>

      {load.status === "loading" || !hydrated ? (
        <div aria-busy className="flex flex-col gap-6">
          <span className="sr-only" role="status">
            Loading your interview prep
          </span>
          <Skeleton aria-hidden className="h-10 w-80 max-w-full" />
          <Skeleton aria-hidden className="h-64 rounded-2xl bg-surface" />
        </div>
      ) : load.status === "missing" ? (
        <Alert
          variant="warn"
          title="That application isn't in your list anymore"
          action={
            <Link href={back.href} className="text-sm font-medium text-ink underline">
              Back to {back.label}
            </Link>
          }
        >
          It may have been deleted on another device.
        </Alert>
      ) : load.status === "error" ? (
        <Alert
          variant="error"
          title="Your interview prep didn't load"
          action={
            <Button variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
          }
        >
          {load.message}
        </Alert>
      ) : target && prep && !remaking ? (
        <>
          <OttoNote
            meta={`${pluralize(prep.questions.length, "question")} · ${pluralize(prep.stories.length, "story", "stories")} · ${pluralize(countBlanks(prep), "blank")} to fill`}
            message="I'll play the interviewer. Answer out loud, then fill the blanks in your words."
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setRemaking(true);
                setJustMade(false);
              }}
            >
              Make a new one
            </Button>
          </OttoNote>
          {prep.demo ? (
            <Alert variant="info" className="bg-surface" title="Demo mode">
              This is sample prep from common questions and your own lines. No AI was used.
            </Alert>
          ) : null}
          {unsaved ? (
            <Alert variant="warn" title="Not saved to this application">
              Copy it now: it will be gone when you leave this page.
            </Alert>
          ) : null}
          <PrepPack prep={prep} target={target} />
        </>
      ) : target ? (
        <PrepForm
          target={target}
          resumes={resumes}
          onDone={done}
          onCancel={prep ? () => setRemaking(false) : undefined}
        />
      ) : null}
    </div>
  );
}
