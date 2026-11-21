import { describe, expect, it } from "vitest";
import { interviewDay, interviewEmailLine, interviewSoonNotice } from "./interview-soon";

// The daily run is at 14:00 UTC; the board saves an interview day as local noon.
const RUN = Date.UTC(2026, 10, 20, 14, 0, 0);
const HOUR = 60 * 60 * 1_000;

describe("interviewDay", () => {
  it("says tomorrow for the next day in the person's own zone", () => {
    expect(interviewDay(Date.UTC(2026, 10, 21, 12), RUN, null)).toBe("tomorrow");
    expect(interviewDay(Date.UTC(2026, 10, 21, 20), RUN, "America/Los_Angeles")).toBe("tomorrow");
    // Noon on the 22nd in Auckland is 23:00 UTC on the 21st, and the run is past midnight there.
    expect(interviewDay(Date.UTC(2026, 10, 21, 23), RUN, "Pacific/Auckland")).toBe("tomorrow");
  });

  it("says today, or names the weekday when the zone is unknown", () => {
    expect(interviewDay(RUN + 3 * HOUR, RUN, "Europe/London")).toBe("today");
    expect(interviewDay(Date.UTC(2026, 10, 21, 23), RUN, "Mars/Olympus")).toBe("tomorrow");
    expect(interviewDay(Date.UTC(2026, 10, 22, 2), RUN, null)).toBe("on Sunday");
  });
});

describe("interviewSoonNotice", () => {
  it("names the company and role and links to the prep, started", () => {
    const notice = interviewSoonNotice(
      { id: "a1", company: "Stripe", role: "Backend Engineer", interviewAt: Date.UTC(2026, 10, 21, 12) },
      RUN,
      null,
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
    );
    expect(blank.title).toBe("Your interview is tomorrow");
    expect(blank.body).toBe("Go over the likely questions in your prep before you go.");
    const long = interviewSoonNotice(
      { id: "a1", company: "A".repeat(300), role: "", interviewAt: Date.UTC(2026, 10, 21, 12) },
      RUN,
      null,
    );
    expect(long.title.length).toBeLessThanOrEqual(120);
    expect(long.title).toContain("…");
  });
});

describe("interviewEmailLine", () => {
  it("gives the email an absolute prep link", () => {
    expect(
      interviewEmailLine(
        { id: "a 1", company: "Stripe", role: "Backend Engineer", interviewAt: Date.UTC(2026, 10, 21, 12) },
        RUN,
        null,
        "https://otto.test",
      ),
    ).toEqual({
      title: "Your interview with Stripe is tomorrow",
      detail: "Backend Engineer",
      prepUrl: "https://otto.test/dashboard/applications/a%201/prep?start=1",
    });
  });
});
