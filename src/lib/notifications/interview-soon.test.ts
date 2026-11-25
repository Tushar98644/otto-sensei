import { describe, expect, it } from "vitest";
import { interviewDay, interviewSoonNotice } from "./interview-soon";

// The daily run is at 14:00 UTC; the board saves an interview day as local noon.
const RUN = Date.UTC(2026, 10, 20, 14, 0, 0);
const HOUR = 60 * 60 * 1_000;

describe("interviewDay", () => {
  it("says tomorrow for the next day in the person's own zone", () => {
    expect(interviewDay(Date.UTC(2026, 10, 21, 12), RUN, null, "en")).toBe("tomorrow");
    expect(interviewDay(Date.UTC(2026, 10, 21, 20), RUN, "America/Los_Angeles", "en")).toBe(
      "tomorrow",
    );
    // Noon on the 22nd in Auckland is 23:00 UTC on the 21st, and the run is past midnight there.
    expect(interviewDay(Date.UTC(2026, 10, 21, 23), RUN, "Pacific/Auckland", "en")).toBe(
      "tomorrow",
    );
  });

  it("says today, or names the weekday when the zone is unknown", () => {
    expect(interviewDay(RUN + 3 * HOUR, RUN, "Europe/London", "en")).toBe("today");
    expect(interviewDay(Date.UTC(2026, 10, 21, 23), RUN, "Mars/Olympus", "en")).toBe("tomorrow");
    expect(interviewDay(Date.UTC(2026, 10, 22, 2), RUN, null, "en")).toBe("on Sunday");
  });
});

describe("interviewSoonNotice", () => {
  it("names the company and role and links to the prep, started", () => {
    const notice = interviewSoonNotice(
      {
        id: "a1",
        company: "Stripe",
        role: "Backend Engineer",
        interviewAt: Date.UTC(2026, 10, 21, 12),
      },
      RUN,
      null,
      "en",
    );
    expect(notice).toEqual({
      title: "Your interview with Stripe is tomorrow",
      body: "For the Backend Engineer role. Go over the likely questions in your prep before you go.",
      link: "/dashboard/applications/a1/prep?start=1",
      applicationId: "a1",
    });
  });

  it("copes with a blank company and role and caps a long one", () => {
    const blank = interviewSoonNotice(
      { id: "a1", company: " ", role: "", interviewAt: Date.UTC(2026, 10, 21, 12) },
      RUN,
      null,
      "en",
    );
    expect(blank.title).toBe("Your interview is tomorrow");
    expect(blank.body).toBe("Go over the likely questions in your prep before you go.");
    const long = interviewSoonNotice(
      { id: "a1", company: "A".repeat(300), role: "", interviewAt: Date.UTC(2026, 10, 21, 12) },
      RUN,
      null,
      "en",
    );
    expect(long.title.length).toBeLessThanOrEqual(120);
    expect(long.title).toContain("…");
  });

  it("speaks the account's language, weekday included", () => {
    const item = { id: "a1", company: "Stripe", role: "Backend Engineer", interviewAt: 0 };
    const sunday = { ...item, interviewAt: Date.UTC(2026, 10, 22, 2) };
    expect(interviewSoonNotice(sunday, RUN, null, "es")).toMatchObject({
      title: "Tu entrevista con Stripe es el domingo",
      body: "Para el puesto de Backend Engineer. Repasa las preguntas probables en tu preparación antes de ir.",
    });
    expect(interviewSoonNotice(sunday, RUN, null, "de").title).toBe(
      "Dein Interview bei Stripe ist am Sonntag",
    );
    const tomorrow = { ...item, interviewAt: Date.UTC(2026, 10, 21, 12) };
    expect(interviewSoonNotice(tomorrow, RUN, null, "pt-BR").title).toBe(
      "Sua entrevista com Stripe é amanhã",
    );
    expect(interviewSoonNotice(tomorrow, RUN, null, "fr").title).toBe(
      "Ton entretien avec Stripe est demain",
    );
  });
});
