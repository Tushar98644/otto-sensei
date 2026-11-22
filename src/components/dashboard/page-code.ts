"use client";

import { workProfileDialog } from "@/components/eligibility/lazy-work-profile-dialog";
import { ROUTES } from "@/components/site/routes";
import { lazyComponent, lazyModule } from "@/components/ui/lazy";

// Each page's split-out parts, in one place so the shell can fetch them before a visit.
export const resumeSections = lazyModule(() => import("./resume-sections"));
export const interviewSections = lazyModule(() => import("./interview/interview-sections"));
export const prepSections = lazyModule(() => import("./applications/prep/prep-sections"));
export const letterCards = lazyModule(() => import("./letters/letters-sections"));
export const letterReader = lazyModule(() => import("./letters/letter-reader"));
export const jobCards = lazyModule(() => import("./jobs/job-card"));
export const skillGapsPanel = lazyComponent(() =>
  import("./applications/skill-gaps").then((m) => m.SkillGapsPanel),
);
export const whatsWorkingPanel = lazyComponent(() =>
  import("./applications/whats-working").then((m) => m.WhatsWorking),
);
const emailSections = () => import("./applications/email/email-sections");
export const emailTrackingPanel = lazyComponent(() =>
  emailSections().then((m) => m.EmailTrackingPanel),
);
export const emailActivity = lazyComponent(() => emailSections().then((m) => m.EmailActivity));

type Loader = { load: () => Promise<unknown> };

const PAGE_CODE: Record<string, readonly Loader[]> = {
  [ROUTES.dashboard]: [resumeSections],
  [ROUTES.dashboardResumes]: [resumeSections],
  [ROUTES.dashboardInterview]: [interviewSections, prepSections],
  [ROUTES.dashboardLetters]: [letterCards, letterReader],
  [ROUTES.dashboardJobs]: [jobCards, workProfileDialog],
  [ROUTES.dashboardApplications]: [
    skillGapsPanel,
    whatsWorkingPanel,
    prepSections,
    emailTrackingPanel,
    emailActivity,
  ],
};

function load(loaders: Iterable<Loader>): void {
  for (const loader of loaders) void loader.load().catch(() => {});
}

export function preloadPageCode(href: string): void {
  load(PAGE_CODE[href] ?? []);
}

export function preloadAllPageCode(): void {
  load(new Set(Object.values(PAGE_CODE).flat()));
}
