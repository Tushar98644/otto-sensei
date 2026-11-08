"use client";

import { ArrowRight, FilePlus, Info, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { upgradeInterval } from "@/components/account/upgrade-interval";
import { useMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { upgradeHref } from "@/components/site/routes";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { TrackView } from "@/lib/analytics/track-view";
import type { RecruiterReport } from "@/lib/checks/types";
import { nextPlan } from "@/config/plans";
import { emptyResume } from "@/lib/resume/schema";
import { useActiveReport, useActiveResume, useStudioStore } from "@/lib/store/resume-store";
import { resetDay } from "@/lib/usage-copy";
import { pluralize } from "@/lib/utils";
import { useReadByRules } from "../import-notes";
import { ChecksList } from "../review/checks-list";
import { HiringSystemsPanel } from "../review/hiring-systems-panel";
import { ReadTextPanel } from "../review/read-text-panel";
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

  if (!resume || !report) {
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

  function startFromScratch() {
    addResume(emptyResume());
    setStep("fix");
  }

  return (
    <div className="flex flex-col gap-8">
      <TrackView
        event="recruiter_view_seen"
        props={{ checks: report.checks.length, problems: report.counts.fail, warnings: report.counts.warn }}
        once={resume.id}
      />
      <div className="flex flex-col gap-4">
        <OttoNote
          meta={readMeta(report)}
          message={scanned ? OTTO.review.scanned : OTTO.review.summary(report.counts)}
        >
          {scanned ? (
            <>
              <Button onClick={startFromScratch}>
                <FilePlus />
                Start from scratch
              </Button>
              <Button variant="outline" onClick={() => setStep("upload")}>
                <Upload />
                Try another file
              </Button>
            </>
          ) : null}
        </OttoNote>
        <CountsSummary report={report} />
        {readBy === "rules_past_allowance" ? (
          // Said once, plainly, with one link: the import is complete and fully editable as is.
          <p className="flex items-start gap-2 text-sm text-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Read with the basic reader.{" "}
              {upgradeTo ? (
                <Link
                  href={upgradeHref(upgradeTo, upgradeInterval(me, upgradeTo))}
                  className="font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
                >
                  Upgrade for AI reading
                </Link>
              ) : (
                `AI reading is back on ${resetDay(me?.period)}.`
              )}
            </span>
          </p>
        ) : readBy === "rules" ? (
          <p className="flex items-start gap-2 text-sm text-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {READ_BY_RULES_NOTE}
          </p>
        ) : null}
      </div>

      {sideBySide ? (
        <div className="grid grid-cols-2 items-start gap-6">
          <ChecksList checks={report.checks} />
          {/* Stays in view while the longer checks column scrolls past. */}
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
          <TabPanel value="checks">
            <ChecksList checks={report.checks} hideHeading />
          </TabPanel>
          <TabPanel value="text">
            <ReadTextPanel report={report} hideHeading />
          </TabPanel>
        </Tabs>
      )}

      <HiringSystemsPanel />

      {/* A scanned file has no lines to fix; Otto's buttons above are the way forward. */}
      {scanned ? null : (
        <div className="flex flex-col sm:flex-row sm:justify-end">
          <Button size="lg" onClick={() => setStep("fix")}>
            Fix my lines
            <ArrowRight />
          </Button>
        </div>
      )}
    </div>
  );
}

// "read 1 page, 97 words": what Otto looked at, for his meta line.
function readMeta(report: RecruiterReport): string {
  return `read ${pluralize(report.pageCount, "page")}, ${pluralize(report.wordCount, "word")}`;
}

function CountsSummary({ report }: { report: RecruiterReport }) {
  const { fail, warn, pass } = report.counts;
  return (
    <ul aria-label="Check results" className="flex flex-wrap gap-2">
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
          <StatusPill status="pass">{pass} passed</StatusPill>
        </li>
      ) : null}
    </ul>
  );
}
