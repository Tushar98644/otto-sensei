import { ROUTES } from "@/components/site/routes";
import type { StudioStep } from "@/lib/store/resume-store";

export type TourName = "studio" | "dashboard";

export type StopShape = "card" | "control";

export type TourStop = {
  id: string;
  title: string;
  body: string;
  target: () => Element | null;
  shape: StopShape;
  screen: string;
  enter?: () => void;
  ready?: () => boolean;
  reveal?: boolean;
};

export type StudioTourState = {
  step: StudioStep;
  hasResume: boolean;
  hasReport: boolean;
};

export function studioTourEligible({ step, hasResume, hasReport }: StudioTourState): boolean {
  if (!hasResume) return false;
  return step === "fix" || (step === "review" && hasReport);
}

export type DashboardTourState = {
  pathname: string;
  hydrated: boolean;
  setupStep?: "wait" | "show" | "skip";
};

export function dashboardTourEligible({
  pathname,
  hydrated,
  setupStep = "skip",
}: DashboardTourState): boolean {
  return hydrated && pathname === ROUTES.dashboard && setupStep === "skip";
}
