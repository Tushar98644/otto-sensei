import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import type { Resume } from "@/lib/resume/schema";
import { countText } from "@/components/studio/count";
import type { StudioStep } from "@/lib/store/resume-store";
import { planStudioTour, type StudioStopId } from "./studio-plan";
import {
  downloadControl,
  fixStepShown,
  fixWithOttoButton,
  libraryLink,
  lineRow,
  quickActions,
  readTextPanel,
  sectionLink,
  setupList,
  tailorControl,
  winRatePanel,
} from "./targets";
import type { TourStop } from "./tours";

type Copy = Pick<TourStop, "title" | "body">;

export type TourCopy = Messages["onboarding"];

export type DashboardStopId =
  | "setup"
  | "actions"
  | "library"
  | "jobs"
  | "applications"
  | "interview"
  | "portfolio"
  | "win-rate";

// The count comes from the setup rows the Up next card really shows (3 on Free, more on Pro).
export function setupStopCopy(copy: TourCopy, format: Format, steps: number | null): Copy {
  const { setup } = copy.dashboard;
  if (!steps || steps < 1) return { title: setup.title, body: setup.none };
  return { title: setup.title, body: countText(format, setup.steps, steps) };
}

export function studioStops({
  step,
  resume,
  hasReport,
  setStep,
  copy,
}: {
  step: StudioStep;
  resume: Resume;
  hasReport: boolean;
  setStep: (step: StudioStep) => void;
  copy: TourCopy;
}): TourStop[] | null {
  const plan = planStudioTour({ step, resume, hasReport });
  if (!plan) return null;
  const STUDIO_COPY: Record<StudioStopId, Copy> = copy.studio;

  const onFix = {
    screen: "fix",
    enter: () => setStep("fix"),
    ready: fixStepShown,
  } satisfies Partial<TourStop>;

  const stops: Record<StudioStopId, TourStop> = {
    "read-text": {
      id: "read-text",
      ...STUDIO_COPY["read-text"],
      target: readTextPanel,
      shape: "card",
      screen: "review",
      enter: () => setStep("review"),
      ready: () => readTextPanel() !== null,
    },
    "fix-with-otto": {
      id: "fix-with-otto",
      ...STUDIO_COPY["fix-with-otto"],
      target: () => {
        const row = lineRow(plan.flaggedLineIds) ?? lineRow(plan.lineIds);
        return row ? fixWithOttoButton(row) : null;
      },
      shape: "control",
      reveal: true,
      ...onFix,
    },
    tailor: {
      id: "tailor",
      ...STUDIO_COPY.tailor,
      target: tailorControl,
      shape: "control",
      ...onFix,
    },
    download: {
      id: "download",
      ...STUDIO_COPY.download,
      target: downloadControl,
      shape: "control",
      ...onFix,
    },
  };

  return plan.stops.map((id) => stops[id]);
}

export function dashboardStops({
  setupSteps = null,
  copy,
  format,
}: {
  setupSteps?: number | null;
  copy: TourCopy;
  format: Format;
}): TourStop[] {
  const DASHBOARD_COPY: Record<Exclude<DashboardStopId, "setup">, Copy> = copy.dashboard;
  const section = (id: "jobs" | "applications" | "interview" | "portfolio"): TourStop => ({
    id,
    ...DASHBOARD_COPY[id],
    target: () => sectionLink(id),
    shape: "control",
    screen: "home",
  });
  return [
    {
      id: "setup",
      ...setupStopCopy(copy, format, setupSteps),
      target: setupList,
      shape: "card",
      screen: "home",
    },
    {
      id: "actions",
      ...DASHBOARD_COPY.actions,
      target: quickActions,
      shape: "card",
      screen: "home",
    },
    {
      id: "library",
      ...DASHBOARD_COPY.library,
      target: libraryLink,
      shape: "control",
      screen: "home",
    },
    section("jobs"),
    section("applications"),
    section("interview"),
    section("portfolio"),
    {
      id: "win-rate",
      ...DASHBOARD_COPY["win-rate"],
      target: winRatePanel,
      shape: "card",
      screen: "home",
    },
  ];
}
