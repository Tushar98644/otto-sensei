import { describe, expect, it } from "vitest";
import { createSampleResume } from "@/lib/resume/sample";
import { EN, EN_FORMAT } from "@/components/studio/testing";
import { dashboardStops, setupStopCopy, studioStops } from "./stops";

const copy = EN.onboarding;

const words = (text: string) => text.trim().split(/\s+/).length;

describe("tour copy", () => {
  const all = [
    ...Object.values(copy.studio),
    ...Object.values(copy.dashboard).filter((stop) => "body" in stop),
    ...[null, 1, 3, 4, 5].map((steps) => setupStopCopy(copy, EN_FORMAT, steps)),
  ];

  it("keeps Otto's lines short and calm", () => {
    for (const { title, body } of all) {
      expect(words(body), body).toBeLessThanOrEqual(18);
      expect(words(title), title).toBeLessThanOrEqual(5);
      expect(`${title} ${body}`).not.toMatch(/!|simply|just|seamless|powerful|magic|AI-powered/i);
    }
  });
});

describe("studioStops", () => {
  it("brings up the step each stop lives on", () => {
    const stops = studioStops({
      step: "review",
      resume: createSampleResume(),
      hasReport: true,
      setStep: () => {},
      copy,
    });
    expect(stops?.map((stop) => [stop.id, stop.screen])).toEqual([
      ["read-text", "review"],
      ["fix-with-otto", "fix"],
      ["tailor", "fix"],
    ]);
    expect(stops?.find((stop) => stop.id === "fix-with-otto")?.reveal).toBe(true);
  });

  it("switches the studio step on entering another screen", () => {
    const steps: string[] = [];
    const stops = studioStops({
      step: "review",
      resume: createSampleResume(),
      hasReport: true,
      setStep: (step) => steps.push(step),
      copy,
    });
    stops?.[1]?.enter?.();
    stops?.[0]?.enter?.();
    expect(steps).toEqual(["fix", "review"]);
  });
});

describe("dashboardStops", () => {
  it("covers setup, Home, every main section and the win rate on one screen", () => {
    const stops = dashboardStops({ copy, format: EN_FORMAT });
    expect(stops.map((stop) => stop.id)).toEqual([
      "setup",
      "actions",
      "library",
      "jobs",
      "applications",
      "interview",
      "portfolio",
      "win-rate",
    ]);
    expect(new Set(stops.map((stop) => stop.screen)).size).toBe(1);
  });

  it("counts the setup steps the card really shows", () => {
    const body = (setupSteps: number | null) =>
      dashboardStops({ setupSteps, copy, format: EN_FORMAT }).find((stop) => stop.id === "setup")?.body;
    expect(body(3)).toContain("Your 3 setup steps tick themselves off.");
    expect(body(4)).toContain("Your 4 setup steps");
    expect(body(1)).toContain("Your 1 setup step ticks itself off.");
    expect(body(null)).not.toMatch(/\d|five/i);
    expect(dashboardStops({ copy, format: EN_FORMAT }).find((stop) => stop.id === "setup")?.body).toBe(body(null));
  });
});
