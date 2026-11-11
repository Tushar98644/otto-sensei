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
  sectionLink,
  setupList,
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

export type DashboardStopId =
  | "setup"
  | "actions"
  | "library"
  | "jobs"
  | "applications"
  | "interview"
  | "portfolio"
  | "win-rate";

export const DASHBOARD_COPY: Record<DashboardStopId, Copy> = {
  setup: {
    title: "Get set up",
    body: "Five quick steps so jobs and checks fit you. Each one ticks itself off.",
  },
  actions: {
    title: "Start here",
    body: "Check a file, tailor a resume to one job, or try a new format.",
  },
  library: {
    title: "Your resumes",
    body: "Every resume and tailored copy lives here. Search by name or company.",
  },
  jobs: {
    title: "Jobs for you",
    body: "Open jobs from company boards, ordered by how closely each one matches your resume.",
  },
  applications: {
    title: "Applications",
    body: "Log each job you apply to on a board. Its letter and interview prep stay linked.",
  },
  interview: {
    title: "Interview prep",
    body: "For each interview: likely questions, stories from your own resume lines, and questions to ask.",
  },
  portfolio: {
    title: "Portfolio",
    body: "Turn your resume into a portfolio site, hosted for you at your own link.",
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

// Home, then each section in the sidebar's order. Stops whose target isn't on screen (the checklist
// once hidden, sections under "More" on a phone) are skipped when the tour starts.
export function dashboardStops(): TourStop[] {
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
      ...DASHBOARD_COPY.setup,
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
