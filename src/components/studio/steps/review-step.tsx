"use client";

import { ArrowRight, FilePlus, Info, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { roomForResume } from "@/components/account/pro-tools";
import { upgradeLink } from "@/components/account/upgrade-interval";
import { useMe } from "@/components/account/use-me";
import { GitHubOffer } from "@/components/github/github-offer";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status";
import { FixFirst, type FixFirstEntry } from "@/components/studio/fix-first";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { TrackView } from "@/lib/analytics/track-view";
import type { RecruiterReport } from "@/lib/checks/types";
import { MAX_TOP, reviewResume, type ResumeReview, type ReviewItem } from "@/lib/lint/review";
import { nextPlan } from "@/config/plans";
import { emptyResume } from "@/lib/resume/schema";
import { useActiveReport, useActiveResume, useStudioStore } from "@/lib/store/resume-store";
import { resetWhen } from "@/lib/usage-copy";
import { pluralize } from "@/lib/utils";
import { useReadByRules } from "../import-notes";
import { ChecksList } from "../review/checks-list";
import { RereadNote } from "../review/reread-note";
import { HiringSystemsPanel } from "../review/hiring-systems-panel";
import { openTarget, targetLabel } from "../review/open-target";
import { ReadTextPanel } from "../review/read-text-panel";
import { reviewItemDomId, WordsChecks } from "../review/words-checks";
import { useMediaQuery } from "../use-media-query";

// Tailwind's lg breakpoint: from here the checks and the extracted text fit side by side.
const SIDE_BY_SIDE = "(min-width: 64rem)";

// Shown when the rule-based parser read the file instead of AI. Locally that means demo mode;
// in production it means the AI call failed and the import fell back.
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
  const sideBySide = useMediaQuery(SIDE_BY_SIDE);
  const [tab, setTab] = useState("checks");
  const review = useMemo(() => (resume ? reviewResume(resume) : null), [resume]);

  // Phones keep the groups in the Checks tab, so it opens first; the row exists a frame later.
  function showGroup(id: ReviewItem["id"]) {
    setTab("checks");
    window.requestAnimationFrame(() => {
      const group = document.getElementById(reviewItemDomId(id));
      if (!(group instanceof HTMLDetailsElement)) return;
      group.open = true;
      group.scrollIntoView({ block: "start" });
      group.querySelector("summary")?.focus({ preventScroll: true });
    });
  }

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
          meta={readMeta(report)}
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
        <CountsSummary report={report} review={review} />
        {readBy === "rules_past_allowance" ? (
          // Said once, plainly, with one link: the import is complete and fully editable as is.
          <p className="flex items-start gap-2 text-sm text-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Read with the basic reader.{" "}
              {upgradeTo ? (
                <Link
                  href={upgradeLink(me, upgradeTo)}
                  className="font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
                >
                  {(user?.plan ?? "free") === "free" && me?.billing.trial !== false
                    ? "Try Pro free for 3 days for AI reading"
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

      {scanned ? null : (
        <FixFirst
          items={fixFirstItems(report, review, resume.id, showGroup)}
          description="The few things to change before anything else. The rest is grouped below."
          empty={
            <StatusPill status="pass">
              Nothing urgent. Your file and your lines read well.
            </StatusPill>
          }
        />
      )}

      {sideBySide ? (
        <div className="grid grid-cols-2 items-start gap-6">
          <div className="flex flex-col gap-8">
            {scanned ? null : <WordsChecks resumeId={resume.id} review={review} />}
            <ChecksList checks={report.checks} title="What hiring software checks" />
          </div>
          <div className="sticky top-20">
            <ReadTextPanel report={report} />
          </div>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabList aria-label="Recruiter view">
            <Tab value="checks">Checks</Tab>
            <Tab value="text">What software reads</Tab>
          </TabList>
          <TabPanel value="checks" className="flex flex-col gap-8">
            {scanned ? null : <WordsChecks resumeId={resume.id} review={review} />}
            <ChecksList checks={report.checks} title="What hiring software checks" />
          </TabPanel>
          <TabPanel value="text">
            <ReadTextPanel report={report} hideHeading />
          </TabPanel>
        </Tabs>
      )}

      <HiringSystemsPanel />

      {/* A scanned file has no lines to fix; Otto's buttons above are the way forward. */}
      {scanned ? null : (
        <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex items-center gap-1 self-end rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-ink/5 max-sm:w-full">
          <Button variant="ghost" onClick={() => setStep("tailor")}>
            <span>
              Skip<span className="max-sm:sr-only"> to tailor</span>
            </span>
          </Button>
          <Button onClick={() => setStep("fix")} className="flex-1 sm:flex-none">
            Next: Fix my lines
            <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}

// High-severity word problems, the ones Otto's note counts.
function wordsToFix(review: ResumeReview): number {
  return review.items.filter((item) => item.severity === "high").length;
}

// File problems lead (unreadable files hide the words), then word problems, then file warnings.
function fixFirstItems(
  report: RecruiterReport,
  review: ResumeReview,
  resumeId: string,
  showGroup: (id: ReviewItem["id"]) => void,
): FixFirstEntry[] {
  const file = (status: "fail" | "warn") =>
    report.checks
      .filter((check) => check.status === status)
      .map((check) => ({ key: check.id, title: check.title, reason: check.fix ?? check.detail }));
  const words = (high: boolean) =>
    review.top
      .filter((item) => (item.severity === "high") === high)
      .map((item) => ({
        key: item.id,
        title: item.title,
        reason: item.reason,
        // One line opens straight in the editor; a group opens below with every line listed.
        action:
          item.lines.length + item.more > 1
            ? {
                label: `See the ${item.lines.length + item.more} lines`,
                onClick: () => showGroup(item.id),
              }
            : {
                label: targetLabel(item.target),
                onClick: () => openTarget(resumeId, item.target),
              },
      }));
  return [...file("fail"), ...words(true), ...file("warn"), ...words(false)].slice(0, MAX_TOP);
}

function readMeta(report: RecruiterReport): string {
  return `read ${pluralize(report.pageCount, "page")}, ${pluralize(report.wordCount, "word")}`;
}

function CountsSummary({ report, review }: { report: RecruiterReport; review: ResumeReview }) {
  const { fail, warn, pass } = report.counts;
  const words = wordsToFix(review);
  return (
    <ul aria-label="Check results" className="flex flex-wrap gap-2">
      {words > 0 ? (
        <li>
          <StatusPill status="warn">{pluralize(words, "thing")} to fix in your words</StatusPill>
        </li>
      ) : null}
      {fail > 0 ? (
        <li>
          <StatusPill status="fail">{pluralize(fail, "problem")}</StatusPill>
        </li>
      ) : null}
      {warn > 0 ? (
        <li>
          <StatusPill status="warn">{pluralize(warn, "warning")}</StatusPill>
        </li>
      ) : null}
      {pass > 0 ? (
        <li>
          <StatusPill status="pass">{pluralize(pass, "file check")} passed</StatusPill>
        </li>
      ) : null}
    </ul>
  );
}
