import { describe, expect, it } from "vitest";
import { ROUTES } from "@/components/site/routes";
import { STUDIO_STEPS } from "@/lib/store/resume-store";
import { dashboardTourEligible, studioTourEligible } from "./tours";

describe("studioTourEligible", () => {
  it("starts on the recruiter view right after an upload", () => {
    expect(studioTourEligible({ step: "review", hasResume: true, hasReport: true })).toBe(true);
  });

  it("starts in the editor for any open resume, uploaded or not", () => {
    expect(studioTourEligible({ step: "fix", hasResume: true, hasReport: true })).toBe(true);
    expect(studioTourEligible({ step: "fix", hasResume: true, hasReport: false })).toBe(true);
  });

  it("waits on the recruiter view when there is no upload report to show", () => {
    expect(studioTourEligible({ step: "review", hasResume: true, hasReport: false })).toBe(false);
  });

  it("never starts on upload, tailor or download", () => {
    for (const step of ["upload", "tailor", "download"] as const) {
      expect(studioTourEligible({ step, hasResume: true, hasReport: true })).toBe(false);
    }
  });

  it("never starts without an open resume", () => {
    for (const step of STUDIO_STEPS) {
      expect(studioTourEligible({ step, hasResume: false, hasReport: false })).toBe(false);
    }
  });
});

describe("dashboardTourEligible", () => {
  it("starts on the dashboard home once the library has loaded", () => {
    expect(dashboardTourEligible({ pathname: ROUTES.dashboard, hydrated: true })).toBe(true);
  });

  it("waits while the home page is still skeletons", () => {
    expect(dashboardTourEligible({ pathname: ROUTES.dashboard, hydrated: false })).toBe(false);
  });

  it("stays off the other dashboard pages", () => {
    for (const pathname of [
      ROUTES.dashboardResumes,
      ROUTES.dashboardApplications,
      ROUTES.dashboardFormats,
      ROUTES.dashboardAccount,
      `${ROUTES.dashboard}/trash`,
    ]) {
      expect(dashboardTourEligible({ pathname, hydrated: true })).toBe(false);
    }
  });

  it("never opens with the first-login step: it waits while the step may open, then starts", () => {
    const home = { pathname: ROUTES.dashboard, hydrated: true };
    expect(dashboardTourEligible({ ...home, setupStep: "wait" })).toBe(false);
    expect(dashboardTourEligible({ ...home, setupStep: "show" })).toBe(false);
    // Saved or skipped: the step reads "skip" and the tour starts in the same visit.
    expect(dashboardTourEligible({ ...home, setupStep: "skip" })).toBe(true);
  });
});
