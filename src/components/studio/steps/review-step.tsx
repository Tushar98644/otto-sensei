"use client";

import { ArrowRight, FilePlus, Info, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { roomForResume } from "@/components/account/pro-tools";
import { upgradeLink } from "@/components/account/upgrade-interval";
import { useMe } from "@/components/account/use-me";
import { GitHubOffer } from "@/components/github/github-offer";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TrackView } from "@/lib/analytics/track-view";
import { trialHeadline } from "@/lib/billing/prices";
import { reviewResume, type ResumeReview } from "@/lib/lint/review";
import { nextPlan } from "@/config/plans";
import { emptyResume } from "@/lib/resume/schema";
import { useActiveReport, useActiveResume, useStudioStore } from "@/lib/store/resume-store";
import { resetWhen } from "@/lib/usage-copy";
import { useReadByRules } from "../import-notes";
import { FixList } from "../review/fix-list";
import { HiringSystemsPanel } from "../review/hiring-systems-panel";
import { ReadTextPanel } from "../review/read-text-panel";
import { RereadNote } from "../review/reread-note";
import { STEP_BAR_CLASSES } from "../step-bar";

const READ_BY_RULES_NOTE =
  process.env.NODE_ENV === "production"
    ? "Your sections were sorted with simple rules this time, not AI. Check that each part landed in the right place."
    : OTTO.demoMode;

export function ReviewStep() {
  const resume = useActiveResume();
  const report = useActiveReport();
  const setStep = useStudioStore((s) => s.setStep);
  const addResume = useStudioStore((s) => s.addResume);
  const readBy = useReadByRules(resume?.id ?? null);
  const { me, user } = useMe();
  const upgradeTo = nextPlan(user?.plan ?? "free");
  const review = useMemo(() => (resume ? reviewResume(resume) : null), [resume]);

  if (!resume || !report || !review) {
    return (
      <EmptyState
        titleAs="h2"
        title="Nothing to review yet"
        description="The recruiter view is for resumes you upload."
        action={<Button onClick={() => setStep("upload")}>Upload a resume</Button>}
      />
    );
  }

  const scanned = report.checks.some(
    (check) => check.id === "text-layer" && check.status === "fail",
  );

  async function startFromScratch() {
    if (!(await roomForResume())) return;
    addResume(emptyResume());
    setStep("fix");
  }

  return (
    <div className="flex flex-col gap-8">
      <TrackView
        event="recruiter_view_seen"
        props={{
          checks: report.checks.length,
          problems: report.counts.fail,
          warnings: report.counts.warn,
        }}
        once={resume.id}
      />
      <div className="flex flex-col gap-4">
        <OttoNote
          message={
            scanned ? OTTO.review.scanned : OTTO.review.overall(report.counts, wordsToFix(review))
          }
        >
          {scanned ? (
            <>
              <Button onClick={() => void startFromScratch()}>
                <FilePlus />
                Start from scratch
              </Button>
              <Button variant="secondary" onClick={() => setStep("upload")}>
                <Upload />
                Try another file
              </Button>
            </>
          ) : null}
        </OttoNote>
        {readBy === "rules_past_allowance" ? (
          <p className="flex items-start gap-2 text-sm text-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Read with the basic reader.{" "}
              {upgradeTo ? (
                <Link
                  href={upgradeLink(me, upgradeTo, ROUTES.studio)}
                  className="font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
                >
                  {(user?.plan ?? "free") === "free" && me?.billing.trial !== false
                    ? `${trialHeadline()} for AI reading`
                    : "Upgrade for AI reading"}
                </Link>
              ) : (
                `AI reading is back ${resetWhen(me?.period)}.`
              )}
            </span>
          </p>
        ) : readBy === "rules" ? (
          <p className="flex items-start gap-2 text-sm text-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {READ_BY_RULES_NOTE}
          </p>
        ) : readBy === "rules_read_well" ? (
          <RereadNote resumeId={resume.id} />
        ) : null}
        {scanned ? null : <GitHubOffer resumeId={resume.id} className="bg-surface" />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReadTextPanel
          report={report}
          className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start"
        />
        <FixList report={report} review={scanned ? null : review} resumeId={resume.id} />
      </div>

      <HiringSystemsPanel />

      {scanned ? null : (
        <div data-tour-edge className={STEP_BAR_CLASSES}>
          <Button variant="ghost" onClick={() => setStep("tailor")}>
            Skip to tailor
          </Button>
          <Button onClick={() => setStep("fix")} className="flex-1 sm:flex-none">
            <span>
              Next: Fix<span className="max-sm:sr-only"> my</span> lines
            </span>
            <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}

function wordsToFix(review: ResumeReview): number {
  return review.items.filter((item) => item.severity === "high").length;
}
