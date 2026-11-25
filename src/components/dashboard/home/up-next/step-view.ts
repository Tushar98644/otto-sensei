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
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { applicationHref } from "@/lib/applications/thread";
import type { Application } from "@/lib/applications/schema";
import { prepHref } from "../../applications/view";
import { formatDay, type DashboardMessages } from "../../i18n";
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

type Steps = DashboardMessages["steps"];

function setupStep(
  id: SetupStepId,
  steps: Steps,
): { title: string; detail: string; icon: LucideIcon; cta: string; href?: string } {
  switch (id) {
    case "work":
      return {
        title: steps.workTitle,
        detail: steps.workDetail,
        icon: Globe,
        cta: steps.setUp,
        href: accountSectionHref("work"),
      };
    case "looking_for":
      return {
        title: steps.lookingTitle,
        detail: steps.lookingDetail,
        icon: Compass,
        cta: steps.setUp,
        href: accountSectionHref("lookingFor"),
      };
    // Only while the resume has no lines yet: an open weak line is the fix row instead.
    case "weak_line":
      return { title: steps.weakTitle, detail: steps.weakDetail, icon: PenLine, cta: steps.start };
  }
}

function joinNames(names: readonly string[], steps: Steps, format: Format): string {
  const [first = "", second = ""] = names;
  if (names.length <= 1) return first;
  if (names.length === 2) return fmt(steps.twoNames, { first, second });
  return fmt(steps.moreNames, {
    names: names.slice(0, 2).join(", "),
    count: format.number(names.length - 2),
  });
}

export function stepView(
  step: Exclude<NextStep, { kind: "upload" }>,
  state: UpNext,
  actions: StudioActions,
  now: number,
  t: DashboardMessages,
  format: Format,
): StepView {
  const { steps } = t;
  switch (step.kind) {
    case "interview": {
      const { application, prepped } = step;
      const at = application.interviewAt ?? undefined;
      return {
        key: `interview-${application.id}`,
        scene: "interview",
        icon: CalendarClock,
        tone: "forest",
        eyebrow: steps.interview,
        title: fmt(prepped ? steps.practiceFor : steps.prepareFor, {
          company: application.company,
        }),
        detail: application.role,
        badge: at === undefined ? undefined : interviewDay(at, now, t, format),
        at,
        cta: prepped ? steps.practice : steps.startPrep,
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
        eyebrow: steps.followUp,
        badge: steps.due,
      } as const;
      if (step.due.length === 1 && first) {
        return {
          ...base,
          title: fmt(steps.followUpWith, { company: first.company }),
          detail: [
            first.role,
            first.status === "interview" && first.interviewAt !== null
              ? fmt(steps.interviewed, { day: formatDay(format, first.interviewAt, now) })
              : fmt(steps.applied, { day: formatDay(format, first.appliedAt, now) }),
          ]
            .filter(Boolean)
            .join(" · "),
          cta: steps.openApplication,
          href: applicationHref(first.id),
        };
      }
      return {
        ...base,
        title: format.plural(steps.followUpOn, step.due.length),
        detail: joinNames(
          [...new Set(step.due.map((application) => application.company))],
          steps,
          format,
        ),
        cta: steps.openApplications,
        href: ROUTES.dashboardApplications,
      };
    }
    case "fix":
      return {
        key: "fix",
        scene: "fix",
        icon: PenLine,
        tone: "sepia",
        eyebrow: steps.yourResume,
        title: format.plural(steps.fixLines, step.lines, { title: step.title }),
        detail: steps.fixDetail,
        cta: steps.fixFirst,
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
        eyebrow: steps.tailoring,
        title: step.company
          ? fmt(steps.continueFor, { company: step.company })
          : steps.continueTailoring,
        detail: step.ran ? steps.suggestionsWaiting : steps.postStillThere,
        badge: step.ran ? steps.ready : undefined,
        cta: steps.continue,
        onSelect: () => actions.open(step.resumeId, "tailor"),
      };
    case "matches":
      return {
        key: "matches",
        scene: "matches",
        icon: Search,
        tone: "green",
        eyebrow: steps.jobs,
        title: format.plural(steps.seeMatches, step.strong),
        detail: steps.matchesDetail,
        badge: fmt(steps.newToday, { count: format.number(step.newToday) }),
        cta: steps.seeMatchesCta,
        href: ROUTES.dashboardJobs,
      };
    case "setup": {
      const { title, detail, icon, cta, href } = setupStep(step.id, steps);
      const base = {
        key: `setup-${step.id}`,
        scene: "setup",
        icon,
        tone: step.id === "weak_line" ? "sepia" : "mist",
        eyebrow: steps.setup,
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
