import { ROUTES } from "@/components/site/routes";
import type { StudioStep } from "@/lib/store/resume-store";

// First-run tours: what a stop is, and when each tour may start. Client-safe and DOM-free, so the
// triggers are unit-tested; the copy, the lookups and the tip load only when a tour starts.

export type TourName = "studio" | "dashboard";

export type StopShape = "card" | "control";

export type TourStop = {
  id: string;
  title: string;
  // Otto's line: first person, 18 words at most.
  body: string;
  // Looked up when the stop is shown, because its screen may not exist yet when the tour starts.
  target: () => Element | null;
  // How the cut-out hugs the target: a card's corners or a key's.
  shape: StopShape;
  // Stops on another screen (a different studio step) bring it up first, then wait until ready.
  screen: string;
  enter?: () => void;
  ready?: () => boolean;
  // The target sits in a visually hidden wrapper that only shows on focus, like a line's tools.
  reveal?: boolean;
};

export type StudioTourState = {
  step: StudioStep;
  hasResume: boolean;
  // The open resume was uploaded, so the recruiter view has a report to show.
  hasReport: boolean;
};

// Right after an upload (the recruiter view), or the first time a resume is open in the editor,
// e.g. the sample. Never on the upload screen, where there is nothing to point at yet, and never
// mid-way through tailoring or downloading, where it would interrupt.
export function studioTourEligible({ step, hasResume, hasReport }: StudioTourState): boolean {
  if (!hasResume) return false;
  return step === "fix" || (step === "review" && hasReport);
}

export type DashboardTourState = {
  pathname: string;
  // The resume library is read from this browser; before that the home page is still skeletons.
  hydrated: boolean;
};

export function dashboardTourEligible({ pathname, hydrated }: DashboardTourState): boolean {
  return hydrated && pathname === ROUTES.dashboard;
}
