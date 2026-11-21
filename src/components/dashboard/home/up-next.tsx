"use client";

import {
  ArrowRight,
  BellRing,
  BriefcaseBusiness,
  CalendarClock,
  Circle,
  PenLine,
  Search,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useId, type ReactNode } from "react";
import { accountSectionHref } from "@/components/setup/links";
import { ROUTES } from "@/components/site/routes";
import { openLineOnArrival } from "@/components/studio/tailor/jump";
import { useNow } from "@/components/studio/use-now";
import { Button, buttonClasses } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { Progress } from "@/components/ui/progress";
import { applicationHref } from "@/lib/applications/thread";
import { pluralize } from "@/lib/utils";
import type { Application } from "@/lib/applications/schema";
import { formatDay, prepHref } from "../applications/view";
import type { StudioActions } from "../use-studio-actions";
import { interviewDay, type NextStep, type SetupStepId } from "./next-steps";
import { UploadZone } from "./upload-zone";
import { useUpNext, type UpNext as UpNextState } from "./use-up-next";

// ?start=1 makes the prep page start by itself; an existing pack just opens.
function prepareHref(application: Pick<Application, "id" | "hasPrep">): string {
  return application.hasPrep ? prepHref(application.id) : `${prepHref(application.id)}?start=1`;
}

type Row = {
  key: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  // The verb on the lead row's key.
  cta: string;
} & ({ href: string; onSelect?: never } | { onSelect: () => void; href?: never });

const SETUP: Record<SetupStepId, { title: string; detail: string; cta: string; href?: string }> = {
  work: {
    title: "Where you can work",
    detail: "Your country and visa needs, so Jobs can flag posts that can't hire you.",
    cta: "Set it up",
    href: accountSectionHref("work"),
  },
  looking_for: {
    title: "What you're looking for",
    detail: "Role, level and place. Jobs puts the closest matches first.",
    cta: "Set it up",
    href: accountSectionHref("lookingFor"),
  },
  // Only while the resume has no lines yet: an open weak line is the fix row instead.
  weak_line: {
    title: "Fix your first weak line",
    detail: "Add your jobs and what you did in them, then Otto marks the weak lines.",
    cta: "Add your jobs",
  },
  reminders: {
    title: "Follow-up reminders",
    detail: "Choose whether Otto also emails you when it's time to follow up.",
    cta: "Choose",
    href: accountSectionHref("reminders"),
  },
};

const joinNames = (names: readonly string[]) =>
  names.length <= 2
    ? names.join(" and ")
    : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;

function rowOf(
  step: Exclude<NextStep, { kind: "upload" }>,
  state: UpNextState,
  actions: StudioActions,
  now: number,
): Row {
  switch (step.kind) {
    case "interview": {
      const { application, prepped } = step;
      const day = application.interviewAt ? interviewDay(application.interviewAt, now) : "";
      return {
        key: `interview-${application.id}`,
        icon: CalendarClock,
        title: `${prepped ? "Practice" : "Prepare"} for your ${application.company} interview`,
        detail: [day, application.role].filter(Boolean).join(" · "),
        cta: prepped ? "Practice" : "Prepare",
        href: prepareHref(application),
      };
    }
    case "follow_up": {
      const [first] = step.due;
      if (step.due.length === 1 && first) {
        return {
          key: "follow-up",
          icon: BellRing,
          title: `Follow up with ${first.company}`,
          detail: [first.role, `applied ${formatDay(first.appliedAt, now)}`]
            .filter(Boolean)
            .join(" · "),
          cta: "Follow up",
          href: applicationHref(first.id),
        };
      }
      return {
        key: "follow-up",
        icon: BellRing,
        title: `Follow up on ${pluralize(step.due.length, "application")}`,
        detail: joinNames([...new Set(step.due.map((application) => application.company))]),
        cta: "Follow up",
        href: ROUTES.dashboardApplications,
      };
    }
    case "fix":
      return {
        key: "fix",
        icon: PenLine,
        title: `Fix ${pluralize(step.lines, "line")} in ${step.title}`,
        detail: "The editor opens on the first one.",
        cta: "Start fixing",
        onSelect: () => {
          if (step.remember) state.remember({ resumeId: step.resumeId, bulletId: step.bulletId });
          openLineOnArrival(step.bulletId);
          actions.open(step.resumeId, "fix");
        },
      };
    case "tailor":
      return {
        key: "tailor",
        icon: BriefcaseBusiness,
        title: step.company ? `Continue tailoring for ${step.company}` : "Continue tailoring",
        detail: step.ran
          ? "Otto's suggestions are waiting for you."
          : "The job post you pasted is still there.",
        cta: "Continue",
        onSelect: () => actions.open(step.resumeId, "tailor"),
      };
    case "matches":
      return {
        key: "matches",
        icon: Search,
        title: `See ${pluralize(step.strong, "strong match", "strong matches")} in Jobs`,
        detail: `${step.newToday} of your matches ${step.newToday === 1 ? "is" : "are"} new today.`,
        cta: "See matches",
        href: ROUTES.dashboardJobs,
      };
    case "setup": {
      const { title, detail, cta, href } = SETUP[step.id];
      const base = { key: `setup-${step.id}`, icon: Circle, title, detail, cta };
      if (href) return { ...base, href };
      const first = state.setup?.own[0];
      return { ...base, onSelect: () => (first ? actions.open(first.id, "fix") : actions.upload()) };
    }
  }
}

export function UpNext({ actions, hasSample }: { actions: StudioActions; hasSample: boolean }) {
  const state = useUpNext();
  const now = useNow();
  if (!state || state.steps.length === 0) return null;
  const { setup } = state;

  return (
    <section
      aria-labelledby="up-next-heading"
      data-tour="dashboard-setup"
      data-setup-steps={setup ? setup.progress.total : undefined}
    >
      <h2 id="up-next-heading" className="sr-only">
        Up next
      </h2>
      <FolderCard tab="Up next" tone="lavender" bodyClassName="flex flex-col px-5 py-0 sm:px-6">
        <ul className="divide-y divide-border">
          {state.steps.map((step, index) => {
            if (step.kind === "upload") {
              return (
                <li key="upload" className="py-5">
                  <UploadZone actions={actions} hasSample={hasSample} />
                </li>
              );
            }
            const row = rowOf(step, state, actions, now);
            return index === 0 ? (
              <LeadItem key={row.key} row={row} />
            ) : (
              <StepItem key={row.key} row={row} />
            );
          })}
        </ul>
        {setup ? (
          <div className="-mx-5 flex items-center gap-3 border-t border-border px-5 py-2 sm:-mx-6 sm:px-6">
            <Progress
              hideLabel
              size="sm"
              className="w-16 shrink-0"
              label="Setup"
              value={setup.progress.done}
              max={setup.progress.total}
              valueText={`${setup.progress.done} of ${setup.progress.total} done`}
            />
            <p className="flex-1 text-sm/5 text-subtle tabular-nums">
              Setup {setup.progress.done} of {setup.progress.total} done
            </p>
            <Button variant="ghost" size="sm" onClick={setup.hide} className="-mr-2 text-muted">
              Hide setup
            </Button>
          </div>
        ) : null}
      </FolderCard>
    </section>
  );
}

// The first step leads: a larger line and the card's one primary key.
function LeadItem({ row }: { row: Row }) {
  const titleId = useId();
  const key = buttonClasses({ className: "w-full sm:w-auto" });
  const label = (
    <>
      {row.cta}
      <ArrowRight aria-hidden />
    </>
  );
  return (
    <li className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:gap-5 sm:py-6">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink"
        >
          <row.icon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span id={titleId} className="text-base/6 font-medium text-pretty text-ink">
            {row.title}
          </span>
          {row.detail ? (
            <span className="text-sm/5 text-pretty text-muted tabular-nums">{row.detail}</span>
          ) : null}
        </span>
      </div>
      {row.href ? (
        <Link href={row.href} aria-describedby={titleId} className={key}>
          {label}
        </Link>
      ) : (
        <button type="button" aria-describedby={titleId} onClick={row.onSelect} className={key}>
          {label}
        </button>
      )}
    </li>
  );
}

const ROW =
  "group/row -mx-2 flex min-h-14 w-[calc(100%+1rem)] items-center gap-4 rounded-lg px-2 py-3 text-left transition-colors duration-150 ease-out -outline-offset-2 hover:bg-ink/4";

function StepItem({ row }: { row: Row }) {
  const body: ReactNode = (
    <>
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center">
        <row.icon className="size-5 text-muted" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm/6 font-medium text-pretty text-ink">{row.title}</span>
        {row.detail ? (
          <span className="text-sm/5 text-pretty text-muted tabular-nums">{row.detail}</span>
        ) : null}
      </span>
      <ArrowRight
        aria-hidden
        className="size-4 shrink-0 text-muted transition-transform duration-150 ease-out group-hover/row:translate-x-0.5 group-hover/row:text-ink"
      />
    </>
  );
  return (
    <li className="py-1">
      {row.href ? (
        <Link href={row.href} className={ROW}>
          {body}
        </Link>
      ) : (
        <button type="button" className={ROW} onClick={row.onSelect}>
          {body}
        </button>
      )}
    </li>
  );
}
