import type { Resume } from "@/lib/resume/schema";
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
  tailorControl,
  winRatePanel,
} from "./targets";
import type { TourStop } from "./tours";

// The tours' words and stops. Loaded only when a tour is about to start.

type Copy = Pick<TourStop, "title" | "body">;

export const STUDIO_COPY: Record<StudioStopId, Copy> = {
  "read-text": {
    title: "What hiring software reads",
    body: "This is your file as hiring software reads it. Anything missing here is missing for recruiters too.",
  },
  "fix-with-otto": {
    title: "Fix a line with Otto",
    body: "Tags show lines that need work. I ask for the facts, then rewrite. I never invent numbers.",
  },
  tailor: {
    title: "Tailor to a job",
    body: "Paste a job link. I'll show what it asks for and help add what you really have.",
  },
  download: {
    title: "Download, free",
    body: "Your PDF is free, always. Then I check it again to show what changed.",
  },
};

export type DashboardStopId = "actions" | "library" | "win-rate";

export const DASHBOARD_COPY: Record<DashboardStopId, Copy> = {
  actions: {
    title: "Start here",
    body: "Check a file, tailor a resume to one job, or try a new format.",
  },
  library: {
    title: "Your resumes",
    body: "Every resume and tailored copy lives here. Search by name or company.",
  },
  "win-rate": {
    title: "Win rate",
    body: "Log the jobs you apply to. I'll show which resume gets you interviews.",
  },
};

export function studioStops({
  step,
  resume,
  hasReport,
  setStep,
}: {
  step: StudioStep;
  resume: Resume;
  hasReport: boolean;
  setStep: (step: StudioStep) => void;
}): TourStop[] | null {
  const plan = planStudioTour({ step, resume, hasReport });
  if (!plan) return null;

  const onFix = {
    screen: "fix",
    enter: () => setStep("fix"),
    // The step's code loads on demand, so its skeleton shows first.
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

export function dashboardStops(): TourStop[] {
  return [
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
    {
      id: "win-rate",
      ...DASHBOARD_COPY["win-rate"],
      target: winRatePanel,
      shape: "card",
      screen: "home",
    },
  ];
}
