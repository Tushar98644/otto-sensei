import { describe, expect, it, vi } from "vitest";
import type { Application } from "@/lib/applications/schema";
import { EN, FORMAT_EN } from "../../messages-testing";
import type { StudioActions } from "../../use-studio-actions";
import type { UpNext } from "../use-up-next";
import { calendarDay } from "./calendar";
import { stepView } from "./step-view";

const NOW = new Date(2026, 10, 22, 15).getTime();
const noon = (day: number) => new Date(2026, 10, day, 12).getTime();

function app(overrides: Partial<Application> = {}): Application {
  return {
    id: "a1",
    resumeId: null,
    resumeTitle: "",
    company: "Stripe",
    role: "Senior Product Designer",
    jobUrl: "",
    appliedAt: noon(2),
    status: "interview",
    stageReached: "interview",
    jobId: null,
    hasPrep: false,
    interviewAt: noon(23),
    interviewTime: null,
    interviewZone: null,
    statusChangedAt: noon(2),
    notes: "",
    followUpAt: null,
    createdAt: noon(2),
    updatedAt: noon(2),
    ...overrides,
  };
}

const state = { steps: [], setup: null, remember: vi.fn() } as UpNext;
const actions = { open: vi.fn(), upload: vi.fn() } as unknown as StudioActions;

describe("Up next step views", () => {
  it("lead an unprepared interview to prep that starts by itself, dated tomorrow", () => {
    const view = stepView(
      { kind: "interview", application: app(), prepped: false },
      state,
      actions,
      NOW,
      EN.dashboard,
      FORMAT_EN,
    );
    expect(view).toMatchObject({
      title: "Prepare for your Stripe interview",
      detail: "Senior Product Designer",
      badge: "Tomorrow",
      cta: "Start prep",
      at: noon(23),
      href: "/dashboard/applications/a1/prep?start=1",
    });
  });

  it("open existing prep as it is, to practise", () => {
    const view = stepView(
      { kind: "interview", application: app({ hasPrep: true }), prepped: true },
      state,
      actions,
      NOW,
      EN.dashboard,
      FORMAT_EN,
    );
    expect(view).toMatchObject({ title: "Practice for your Stripe interview", cta: "Practice" });
    expect(view.href).toBe("/dashboard/applications/a1/prep");
  });

  it("show new matches as a badge, with thousands grouped", () => {
    const view = stepView(
      { kind: "matches", strong: 4, newToday: 1140 },
      state,
      actions,
      NOW,
      EN.dashboard,
      FORMAT_EN,
    );
    expect(view).toMatchObject({
      title: "See 4 strong matches in Jobs",
      badge: "1,140 new today",
      href: "/dashboard/jobs",
    });
  });

  it("open the editor on the first weak line", () => {
    const view = stepView(
      { kind: "fix", resumeId: "r1", bulletId: "b1", title: "maya", lines: 6, remember: false },
      state,
      actions,
      NOW,
      EN.dashboard,
      FORMAT_EN,
    );
    expect(view.title).toBe("Fix 6 lines in maya");
    view.onSelect?.();
    expect(actions.open).toHaveBeenCalledWith("r1", "fix");
  });

  it("send setup steps to their account section", () => {
    const view = stepView(
      { kind: "setup", id: "work" },
      state,
      actions,
      NOW,
      EN.dashboard,
      FORMAT_EN,
    );
    expect(view).toMatchObject({ title: "Where you can work", eyebrow: "Setup" });
    expect(view.href).toMatch(/^\/dashboard\/account#/);
  });
});

describe("the calendar page", () => {
  it("reads the interview's own local day", () => {
    expect(calendarDay(noon(23), FORMAT_EN)).toEqual({ month: "Nov", day: 23, weekday: "Monday" });
  });
});
