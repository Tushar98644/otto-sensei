import { describe, expect, it } from "vitest";
import { NO_CHOICE, type LookingFor } from "@/lib/job-feed/types";
import { confirmedChoice, setupStepDecision, type StepFacts } from "./step";

const step = (patch: Partial<StepFacts> = {}): StepFacts => ({
  pathname: "/dashboard",
  signedIn: true,
  ready: true,
  work: { status: "ready", updatedAt: null },
  setup: { status: "ready", stepAt: null },
  localStepAt: null,
  ...patch,
});

describe("setupStepDecision: the first-login step shows once", () => {
  it("shows on Home or Jobs for an account that hasn't set anything", () => {
    expect(setupStepDecision(step())).toBe("show");
    expect(setupStepDecision(step({ pathname: "/dashboard/jobs" }))).toBe("show");
  });

  it("never again once answered or skipped, here or in this browser", () => {
    expect(setupStepDecision(step({ setup: { status: "ready", stepAt: 10 } }))).toBe("skip");
    expect(setupStepDecision(step({ localStepAt: 10 }))).toBe("skip");
  });

  it("never for someone who already saved a work profile or a Looking for choice", () => {
    expect(setupStepDecision(step({ work: { status: "ready", updatedAt: 5 } }))).toBe("skip");
  });

  it("waits until the plan, resumes, profile and setup are known", () => {
    expect(setupStepDecision(step({ ready: false }))).toBe("wait");
    expect(setupStepDecision(step({ work: { status: "loading", updatedAt: null } }))).toBe("wait");
    expect(setupStepDecision(step({ setup: { status: "loading", stepAt: null } }))).toBe("wait");
  });

  it("stays away from other pages, signed-out visitors and an unreadable profile", () => {
    expect(setupStepDecision(step({ pathname: "/dashboard/account" }))).toBe("skip");
    expect(setupStepDecision(step({ signedIn: false }))).toBe("skip");
    expect(setupStepDecision(step({ work: { status: "error", updatedAt: null } }))).toBe("skip");
  });

  it("falls back to this browser's memory when the server can't say", () => {
    expect(setupStepDecision(step({ setup: { status: "error", stepAt: null } }))).toBe("show");
    expect(
      setupStepDecision(step({ setup: { status: "error", stepAt: null }, localStepAt: 3 })),
    ).toBe("skip");
  });
});

const SHOWN: LookingFor = {
  title: "Backend Engineer",
  family: "engineering",
  occupation: null,
  level: "senior",
  place: "g:eu",
  remote: true,
};

describe("confirmedChoice: what the step's Save keeps", () => {
  it("keeps the confirmed role and level, and leaves the place to the country on Pro", () => {
    expect(confirmedChoice({ shown: SHOWN, picked: NO_CHOICE, placeFollowsCountry: true })).toEqual({
      role: { title: "Backend Engineer", family: "engineering", occupation: null },
      level: "senior",
      place: null,
      remote: true,
    });
  });

  it("keeps the shown place where no country is saved, but never a bare anywhere", () => {
    expect(
      confirmedChoice({ shown: SHOWN, picked: NO_CHOICE, placeFollowsCountry: false }).place,
    ).toBe("g:eu");
    expect(
      confirmedChoice({
        shown: { ...SHOWN, place: "anywhere" },
        picked: NO_CHOICE,
        placeFollowsCountry: false,
      }).place,
    ).toBeNull();
  });

  it("keeps what the person picked over any guess, and no role when nothing names one", () => {
    const picked = { ...NO_CHOICE, place: "c:US" as const, level: "lead" as const };
    expect(confirmedChoice({ shown: SHOWN, picked, placeFollowsCountry: true })).toMatchObject({
      place: "c:US",
      level: "lead",
    });
    expect(
      confirmedChoice({
        shown: { ...SHOWN, title: "", family: null, level: null },
        picked: NO_CHOICE,
        placeFollowsCountry: true,
      }),
    ).toMatchObject({ role: null, level: null });
  });
});
