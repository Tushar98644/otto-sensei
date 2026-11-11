import { describe, expect, it } from "vitest";
import { createSampleResume } from "@/lib/resume/sample";
import { DASHBOARD_COPY, dashboardStops, STUDIO_COPY, studioStops } from "./stops";

const words = (text: string) => text.trim().split(/\s+/).length;

describe("tour copy", () => {
  const all = [...Object.values(STUDIO_COPY), ...Object.values(DASHBOARD_COPY)];

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
    });
    stops?.[1]?.enter?.();
    stops?.[0]?.enter?.();
    expect(steps).toEqual(["fix", "review"]);
  });
});

describe("dashboardStops", () => {
  it("covers setup, Home, every main section and the win rate on one screen", () => {
    const stops = dashboardStops();
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
});
