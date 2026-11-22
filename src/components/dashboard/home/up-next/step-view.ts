import {
  BellRing,
  BriefcaseBusiness,
  CalendarClock,
  Compass,
  Globe,
  PenLine,
  Search,
  type LucideIcon,
} from "lucide-react";
import { accountSectionHref } from "@/components/setup/links";
import { ROUTES } from "@/components/site/routes";
import { openLineOnArrival } from "@/components/studio/tailor/jump";
import { applicationHref } from "@/lib/applications/thread";
import type { Application } from "@/lib/applications/schema";
import { pluralize } from "@/lib/utils";
import { formatDay, prepHref } from "../../applications/view";
import type { StudioActions } from "../../use-studio-actions";
import { interviewDay, type NextStep, type SetupStepId } from "../next-steps";
import type { UpNext } from "../use-up-next";

export type StepTone = "forest" | "amber" | "sepia" | "green" | "mist";
export type StepScene = "interview" | "follow_up" | "fix" | "tailor" | "setup" | "matches";

export type StepView = {
  key: string;
  scene: StepScene;
  icon: LucideIcon;
  tone: StepTone;
  eyebrow: string;
  title: string;
  detail: string;
  cta: string;
  badge?: string;
  at?: number;
} & ({ href: string; onSelect?: never } | { onSelect: () => void; href?: never });

// ?start=1 makes the prep page start by itself; an existing pack just opens.
function prepareHref(application: Pick<Application, "id" | "hasPrep">): string {
  return application.hasPrep ? prepHref(application.id) : `${prepHref(application.id)}?start=1`;
}

const SETUP: Record<
  SetupStepId,
  { title: string; detail: string; icon: LucideIcon; cta: string; href?: string }
> = {
  work: {
    title: "Where you can work",
    detail: "Your country and visa needs, so Jobs can flag posts that can't hire you.",
    icon: Globe,
    cta: "Set it up",
    href: accountSectionHref("work"),
  },
  looking_for: {
    title: "What you're looking for",
    detail: "Role, level and place. Jobs puts the closest matches first.",
    icon: Compass,
    cta: "Set it up",
    href: accountSectionHref("lookingFor"),
  },
  // Only while the resume has no lines yet: an open weak line is the fix row instead.
  weak_line: {
    title: "Fix your first weak line",
    detail: "Add your jobs and what you did in them, then Otto marks the weak lines.",
    icon: PenLine,
    cta: "Start",
  },
};

const count = new Intl.NumberFormat("en-US");

const joinNames = (names: readonly string[]) =>
  names.length <= 2
    ? names.join(" and ")
    : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;

export function stepView(
  step: Exclude<NextStep, { kind: "upload" }>,
  state: UpNext,
  actions: StudioActions,
  now: number,
): StepView {
  switch (step.kind) {
    case "interview": {
      const { application, prepped } = step;
      const at = application.interviewAt ?? undefined;
      return {
        key: `interview-${application.id}`,
        scene: "interview",
        icon: CalendarClock,
        tone: "forest",
        eyebrow: "Interview",
        title: `${prepped ? "Practice" : "Prepare"} for your ${application.company} interview`,
        detail: application.role,
        badge: at === undefined ? undefined : interviewDay(at, now),
        at,
        cta: prepped ? "Practice" : "Start prep",
        href: prepareHref(application),
      };
    }
    case "follow_up": {
      const [first] = step.due;
      const base = {
        key: "follow-up",
        scene: "follow_up",
        icon: BellRing,
        tone: "amber",
        eyebrow: "Follow-up",
        badge: "Due",
      } as const;
      if (step.due.length === 1 && first) {
        return {
          ...base,
          title: `Follow up with ${first.company}`,
          detail: [
            first.role,
            first.status === "interview" && first.interviewAt !== null
              ? `interviewed ${formatDay(first.interviewAt, now)}`
              : `applied ${formatDay(first.appliedAt, now)}`,
          ]
            .filter(Boolean)
            .join(" · "),
          cta: "Open the application",
          href: applicationHref(first.id),
        };
      }
      return {
        ...base,
        title: `Follow up on ${pluralize(step.due.length, "application")}`,
        detail: joinNames([...new Set(step.due.map((application) => application.company))]),
        cta: "Open Applications",
        href: ROUTES.dashboardApplications,
      };
    }
    case "fix":
      return {
        key: "fix",
        scene: "fix",
        icon: PenLine,
        tone: "sepia",
        eyebrow: "Your resume",
        title: `Fix ${pluralize(step.lines, "line")} in ${step.title}`,
        detail: "The editor opens on the first one.",
        cta: "Fix the first line",
        onSelect: () => {
          if (step.remember) state.remember({ resumeId: step.resumeId, bulletId: step.bulletId });
          openLineOnArrival(step.bulletId);
          actions.open(step.resumeId, "fix");
        },
      };
    case "tailor":
      return {
        key: "tailor",
        scene: "tailor",
        icon: BriefcaseBusiness,
        tone: "forest",
        eyebrow: "Tailoring",
        title: step.company ? `Continue tailoring for ${step.company}` : "Continue tailoring",
        detail: step.ran
          ? "Otto's suggestions are waiting for you."
          : "The job post you pasted is still there.",
        badge: step.ran ? "Ready" : undefined,
        cta: "Continue",
        onSelect: () => actions.open(step.resumeId, "tailor"),
      };
    case "matches":
      return {
        key: "matches",
        scene: "matches",
        icon: Search,
        tone: "green",
        eyebrow: "Jobs",
        title: `See ${pluralize(step.strong, "strong match", "strong matches")} in Jobs`,
        detail: "Open jobs that fit your resume.",
        badge: `${count.format(step.newToday)} new today`,
        cta: "See matches",
        href: ROUTES.dashboardJobs,
      };
    case "setup": {
      const { title, detail, icon, cta, href } = SETUP[step.id];
      const base = {
        key: `setup-${step.id}`,
        scene: "setup",
        icon,
        tone: step.id === "weak_line" ? "sepia" : "mist",
        eyebrow: "Setup",
        title,
        detail,
        cta,
      } as const;
      if (href) return { ...base, href };
      const first = state.setup?.own[0];
      return {
        ...base,
        onSelect: () => (first ? actions.open(first.id, "fix") : actions.upload()),
      };
    }
  }
}
