"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { useSessionUserId } from "@/components/account/session-user";
import { Otto, type OttoPose } from "@/components/mascot/otto";
import { ROUTES } from "@/components/site/routes";
import { useNow } from "@/components/studio/use-now";
import { Button, buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FolderCard } from "@/components/ui/folder-card";
import { useFormat, useMessages } from "@/i18n/client";
import { rich, type RichTags } from "@/i18n/rich";
import type { Application } from "@/lib/applications/schema";
import { tally } from "@/lib/applications/stats";
import {
  letteredApplications,
  resumeKinds,
  whatsWorking,
  type Comparison,
  type Group,
  type Working,
} from "@/lib/applications/working";
import { useAppQueryClient } from "@/lib/queries/client";
import { letteredApplicationsQuery, writingsQuery } from "@/lib/queries/options";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import type { ApplicationsMessages } from "../i18n";
import { findingLines, notEnoughText, suggestionText, waitingText } from "./copy";

type Variant = "home" | "page";

export type WhatsWorkingProps = {
  applications: readonly Application[];
  resumes: readonly Resume[];
  variant: Variant;
  // Opens the studio's Tailor step; without it the suggestion links to Jobs.
  onTailor?: (() => void) | null;
  onAddApplication?: () => void;
};

export function WhatsWorking({
  applications,
  resumes,
  variant,
  onTailor,
  onAddApplication,
}: WhatsWorkingProps) {
  const t = useMessages("applications");
  const format = useFormat();
  const now = useNow();
  const userId = useSessionUserId();
  const pro = useProTools() === true;
  const client = useAppQueryClient();
  // The letters list once something has loaded it, else just which applications have a letter.
  const listed = client.getQueryData(writingsQuery(userId ?? "").queryKey) !== undefined;
  const letters = useQuery(
    { ...writingsQuery(userId ?? ""), enabled: pro && !!userId && listed },
    client,
  );
  const ids = useQuery(
    { ...letteredApplicationsQuery(userId ?? ""), enabled: pro && !!userId && !letters.data },
    client,
  );
  const kinds = useMemo(() => resumeKinds(resumes), [resumes]);
  const lettered = useMemo(() => {
    if (!pro) return null;
    if (letters.data) return letteredApplications(letters.data.items);
    return ids.data ? new Set(ids.data) : null;
  }, [pro, letters.data, ids.data]);
  const working = useMemo(
    () => (now === 0 ? null : whatsWorking({ applications, kinds, lettered, now })),
    [applications, kinds, lettered, now],
  );
  const counts = useMemo(() => tally(applications), [applications]);

  return (
    <FolderCard
      data-tour={variant === "home" ? "dashboard-win-rate" : undefined}
      tab={t.working.tab}
      tabEnd={
        variant === "home" ? (
          <Link
            href={ROUTES.dashboardApplications}
            className="group inline-flex items-center gap-1 text-sm font-medium text-ink"
          >
            {t.working.applications}
            <ArrowRight
              aria-hidden
              className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ) : null
      }
      bodyClassName="p-2"
    >
      <div className="group/otto grid gap-2 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:grid-cols-[max(15rem,calc((100%-1.5rem)/3-1rem))_minmax(0,1fr)]">
        <WorkingArt comparison={working?.resume ?? null} />
        <div className="flex min-w-0 flex-col items-start gap-4 px-2 pt-2 pb-3 sm:justify-center sm:px-4 sm:py-5 lg:px-6">
          {working ? (
            <Findings working={working} onTailor={onTailor} onAddApplication={onAddApplication} />
          ) : (
            <p className="text-sm/6 text-muted">{t.working.counting}</p>
          )}
        </div>
      </div>
      {variant === "home" && counts.applications > 0 ? (
        <p className="border-t border-border px-4 pt-3 pb-2 text-sm/5 text-subtle sm:px-6">
          {[
            format.plural(t.count.applications, counts.applications),
            format.plural(t.count.interviews, counts.interviews),
            format.plural(t.count.offers, counts.offers),
          ].join(" · ")}
        </p>
      ) : null}
    </FolderCard>
  );
}

function Findings({
  working,
  onTailor,
  onAddApplication,
}: {
  working: Working;
  onTailor?: (() => void) | null;
  onAddApplication?: () => void;
}) {
  const t = useMessages("applications");
  const words = t.working;
  const format = useFormat();
  const { resume, letter } = working;
  const finding = resume.ready ? findingLines(resume, t) : null;
  const waiting = waitingText(working.waiting, t, format);
  const next = suggestionText(working, t, format);
  return (
    <>
      <div className="flex flex-col gap-2">
        <Eyebrow>
          {working.total === 0 ? words.fromOwn : format.plural(words.fromYour, working.total)}
        </Eyebrow>
        {finding ? (
          <p className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink sm:text-3xl/9">
            {rich(finding.lead, MARK)} {finding.rest}
          </p>
        ) : (
          <>
            <p className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink sm:text-3xl/9">
              {working.total === 0 ? words.seeWhich : words.notEnough}
            </p>
            {working.total > 0 ? (
              <p className="text-sm/6 text-pretty text-muted">{notEnoughText(resume, t, format)}</p>
            ) : null}
          </>
        )}
        {letter ? (
          <p className="text-sm/6 text-pretty text-muted">
            {letter.ready ? letterText(letter, t) : notEnoughText(letter, t, format)}
          </p>
        ) : null}
        {waiting ? <p className="text-sm/6 text-pretty text-subtle">{waiting}</p> : null}
      </div>
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm/6 font-medium text-pretty text-ink">{next.text}</p>
        {next.action ? (
          <NextAction
            kind={working.suggestion}
            label={next.action}
            onTailor={onTailor}
            onAddApplication={onAddApplication}
          />
        ) : null}
      </div>
    </>
  );
}

const MARK: RichTags = { b: (chunk) => <mark className="highlighter text-ink">{chunk}</mark> };
const PLAIN: RichTags = { b: (chunk) => chunk };

function letterText(comparison: Comparison, t: ApplicationsMessages) {
  const finding = findingLines(comparison, t);
  return (
    <>
      {rich(finding.lead, PLAIN)} {finding.rest}
    </>
  );
}

const ACTION = "max-sm:w-full";

function NextAction({
  kind,
  label,
  onTailor,
  onAddApplication,
}: {
  kind: Working["suggestion"];
  label: string;
  onTailor?: (() => void) | null;
  onAddApplication?: () => void;
}) {
  const { working: words } = useMessages("applications");
  const arrow = <ArrowRight aria-hidden className="size-4" />;
  if (kind === "tailor" && onTailor) {
    return (
      <Button variant="secondary" size="sm" className={ACTION} onClick={onTailor}>
        {label}
        {arrow}
      </Button>
    );
  }
  if (kind === "log" && onAddApplication) {
    return (
      <Button variant="secondary" size="sm" className={ACTION} onClick={onAddApplication}>
        {label}
        {arrow}
      </Button>
    );
  }
  const href =
    kind === "letter"
      ? ROUTES.dashboardLetters
      : kind === "log"
        ? ROUTES.dashboardApplications
        : ROUTES.dashboardJobs;
  return (
    <Link
      href={href}
      className={buttonClasses({ variant: "secondary", size: "sm", className: ACTION })}
    >
      {kind === "tailor" ? words.findJob : label}
      {arrow}
    </Link>
  );
}

const SHEET_DOTS = 6;

function dotsOf(group: Group, measure: Comparison["measure"]): number {
  if (group.counted === 0) return 0;
  const hits = measure === "interviews" ? group.interviews : group.replies;
  return Math.round((hits / group.counted) * SHEET_DOTS);
}

// Two sheets, tailored and general, with a dot for each share of interviews; Otto points at the one that does better.
function WorkingArt({ comparison }: { comparison: Comparison | null }) {
  const { working: words } = useMessages("applications");
  const ready = comparison?.ready === true;
  const pose: OttoPose = !ready ? "think" : comparison.leader === "same" ? "read" : "point";
  const sheets = [
    { label: words.tailored, group: comparison?.with ?? null, lead: comparison?.leader === "with" },
    {
      label: words.general,
      group: comparison?.without ?? null,
      lead: comparison?.leader === "without",
    },
  ];
  return (
    <div
      aria-hidden
      className="relative h-40 overflow-hidden rounded-xl bg-surface-muted sm:h-full sm:min-h-44"
      style={{ "--otto-delay": "-4.6s" } as CSSProperties}
    >
      <div className="absolute inset-y-0 right-4 flex items-center gap-2.5 pb-4">
        {sheets.map((sheet) => {
          const filled =
            ready && sheet.group && comparison ? dotsOf(sheet.group, comparison.measure) : 0;
          return (
            <div
              key={sheet.label}
              className={cn(
                "flex w-20 flex-col gap-1.5 rounded-md p-2.5 transition duration-300 ease-out",
                ready
                  ? "bg-surface shadow-page group-hover/otto:-translate-y-0.5"
                  : "border border-dashed border-border-strong",
                sheet.lead && "-translate-y-1",
              )}
            >
              <span
                className={cn(
                  "w-fit rounded-sm px-1 text-[9px]/3 font-medium tracking-wider uppercase",
                  sheet.label === "Tailored"
                    ? "bg-lavender text-ink"
                    : "bg-surface-muted text-muted",
                )}
              >
                {sheet.label}
              </span>
              <span className="mt-0.5 block h-1 w-12 rounded-full bg-surface-strong" />
              <span className="block h-1 w-9 rounded-full bg-surface-strong" />
              <span className="mt-1.5 grid w-fit grid-cols-3 gap-1.5">
                {Array.from({ length: SHEET_DOTS }, (_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "size-3 rounded-full",
                      index < filled ? "bg-pass" : "border border-border-strong",
                    )}
                  />
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <Otto pose={pose} size={100} lively settle className="absolute -bottom-1 left-2" />
    </div>
  );
}
