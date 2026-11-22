import { describe, expect, it } from "vitest";
import type { ApplicationStatus } from "@/lib/applications/status";
import {
  companyKey,
  interviewFrom,
  matchCard,
  planChange,
  similarRole,
  type Card,
  type EmailWhen,
} from "./match";

let next = 0;
function card(
  company: string,
  role: string,
  status: ApplicationStatus = "applied",
  jobUrl = "",
): Card {
  next += 1;
  return {
    id: `card-${next}`,
    company,
    role,
    jobUrl,
    status,
    appliedAt: next,
    interviewAt: null,
    interviewTime: null,
    interviewZone: null,
  };
}

// A day alone, read at noon in its zone, or a stated time.
const day = (at: number, zone = "UTC"): EmailWhen => ({ at, time: null, zone });
const dayOnly = (at: number) => ({ interviewAt: at, interviewTime: null, interviewZone: null });

describe("matching an email to a card", () => {
  it("uses the job link first, whatever the names say", () => {
    const linked = card(
      "Acme",
      "Designer",
      "applied",
      "https://jobs.lever.co/acme/123?lever-source=x",
    );
    const other = card("Acme Inc", "Backend Engineer");
    const match = matchCard([other, linked], {
      company: "Acme",
      role: "Backend Engineer",
      jobUrl: "https://jobs.lever.co/acme/123/",
    });
    expect(match).toEqual({ card: linked, by: "link" });
  });

  it("then the company with a like title, then the company's one open card", () => {
    const designer = card("Northwind Ltd.", "Senior Product Designer");
    const engineer = card("Northwind", "Staff Engineer");
    const cards = [designer, engineer];
    expect(
      matchCard(cards, { company: "Northwind", role: "Sr. Product Designer", jobUrl: "" })?.card,
    ).toBe(designer);
    expect(matchCard(cards, { company: "Northwind", role: "", jobUrl: "" })).toBeNull();
    const single = [card("Quill", "Founding Engineer"), card("Quill", "Intern", "rejected")];
    expect(matchCard(single, { company: "Quill", role: "", jobUrl: "" })?.card).toBe(single[0]);
  });

  it("finds nothing at another company", () => {
    expect(
      matchCard([card("Lumen Labs", "Engineer")], {
        company: "Lumen",
        role: "Engineer",
        jobUrl: "",
      })?.by,
    ).toBe("company_role");
    expect(
      matchCard([card("Lumen Labs", "Engineer")], {
        company: "Lumina",
        role: "Engineer",
        jobUrl: "",
      }),
    ).toBeNull();
  });

  it("compares names and titles loosely", () => {
    expect(companyKey("Saffron Systems Pvt. Ltd.")).toBe("saffron");
    expect(similarRole("Backend Engineer, Payments", "Backend Engineer")).toBe(true);
    expect(similarRole("Sr. SWE", "Senior Software Engineer")).toBe(true);
    expect(similarRole("Data Analyst", "Product Designer")).toBe(false);
  });
});

describe("what an email may change", () => {
  it("adds a card when none matches, in the email's stage", () => {
    expect(planChange("applied", null, null)).toEqual({
      change: "created",
      status: "applied",
      interview: null,
    });
    expect(planChange("interview", null, day(5))).toEqual({
      change: "created",
      status: "interview",
      interview: dayOnly(5),
    });
    expect(planChange("assessment", null, day(5))).toEqual({
      change: "created",
      status: "interview",
      interview: null,
    });
    expect(planChange("unknown", null, null)).toEqual({ change: "none" });
  });

  it("moves cards forward and never back", () => {
    const at = (status: ApplicationStatus) => card("Acme", "Engineer", status);
    expect(planChange("rejected", at("interview"), null)).toEqual({
      change: "moved",
      status: "rejected",
      interview: null,
    });
    expect(planChange("interview", at("no_reply"), day(9))).toEqual({
      change: "moved",
      status: "interview",
      interview: dayOnly(9),
    });
    expect(planChange("applied", at("rejected"), null)).toEqual({ change: "none" });
    expect(planChange("applied", at("interview"), null)).toEqual({ change: "none" });
    expect(planChange("interview", at("offer"), day(9))).toEqual({ change: "none" });
    expect(planChange("interview", at("rejected"), day(9))).toEqual({ change: "none" });
    expect(planChange("rejected", at("offer"), null)).toEqual({ change: "none" });
    expect(planChange("offer", at("rejected"), null)).toEqual({ change: "none" });
  });

  it("sets a new interview day on a card already in Interviewing", () => {
    const interviewing = { ...card("Acme", "Engineer", "interview"), interviewAt: 1 };
    expect(planChange("interview", interviewing, day(2))).toEqual({
      change: "dated",
      interview: dayOnly(2),
    });
    expect(planChange("interview", interviewing, day(1))).toEqual({ change: "none" });
    expect(planChange("interview", interviewing, null)).toEqual({ change: "none" });
  });

  it("writes the time and zone an email states, and a day alone keeps a typed time", () => {
    // Tuesday 24 November 2026, 10:00 AM in Los Angeles.
    const tenAm = Date.UTC(2026, 10, 24, 18);
    const stated: EmailWhen = { at: tenAm, time: 600, zone: "America/Los_Angeles" };
    expect(interviewFrom(stated, null)).toEqual({
      interviewAt: tenAm,
      interviewTime: 600,
      interviewZone: "America/Los_Angeles",
    });
    const typed = {
      ...card("Acme", "Engineer", "interview"),
      interviewAt: Date.UTC(2026, 10, 24, 6, 30),
      interviewTime: 870,
      interviewZone: "Asia/Kolkata",
    };
    // Moved to Thursday, with no time given: 2:30 PM stays, now on Thursday.
    const thursday = day(Date.UTC(2026, 10, 26, 6, 30), "Asia/Kolkata");
    expect(planChange("interview", typed, thursday)).toEqual({
      change: "dated",
      interview: {
        interviewAt: Date.UTC(2026, 10, 26, 6, 30),
        interviewTime: 870,
        interviewZone: "Asia/Kolkata",
      },
    });
    // The same day again changes nothing, and a new time replaces the typed one.
    expect(
      planChange("interview", typed, day(Date.UTC(2026, 10, 24, 6, 30), "Asia/Kolkata")),
    ).toEqual({ change: "none" });
    expect(planChange("interview", typed, stated)).toEqual({
      change: "dated",
      interview: interviewFrom(stated, typed),
    });
    // A day read in another zone keeps its own date where the time was typed.
    const newYorkNoon = day(Date.UTC(2026, 10, 26, 17), "America/New_York");
    expect(interviewFrom(newYorkNoon, typed).interviewAt).toBe(Date.UTC(2026, 10, 26, 6, 30));
  });
});
