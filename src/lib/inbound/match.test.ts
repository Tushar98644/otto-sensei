import { describe, expect, it } from "vitest";
import type { ApplicationStatus } from "@/lib/applications/status";
import { companyKey, matchCard, planChange, similarRole, type Card } from "./match";

let next = 0;
function card(
  company: string,
  role: string,
  status: ApplicationStatus = "applied",
  jobUrl = "",
): Card {
  next += 1;
  return { id: `card-${next}`, company, role, jobUrl, status, appliedAt: next, interviewAt: null };
}

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
      interviewAt: null,
    });
    expect(planChange("interview", null, 5)).toEqual({
      change: "created",
      status: "interview",
      interviewAt: 5,
    });
    expect(planChange("assessment", null, 5)).toEqual({
      change: "created",
      status: "interview",
      interviewAt: null,
    });
    expect(planChange("unknown", null, null)).toEqual({ change: "none" });
  });

  it("moves cards forward and never back", () => {
    const at = (status: ApplicationStatus) => card("Acme", "Engineer", status);
    expect(planChange("rejected", at("interview"), null)).toEqual({
      change: "moved",
      status: "rejected",
      interviewAt: null,
    });
    expect(planChange("interview", at("no_reply"), 9)).toEqual({
      change: "moved",
      status: "interview",
      interviewAt: 9,
    });
    expect(planChange("applied", at("rejected"), null)).toEqual({ change: "none" });
    expect(planChange("applied", at("interview"), null)).toEqual({ change: "none" });
    expect(planChange("interview", at("offer"), 9)).toEqual({ change: "none" });
    expect(planChange("interview", at("rejected"), 9)).toEqual({ change: "none" });
    expect(planChange("rejected", at("offer"), null)).toEqual({ change: "none" });
    expect(planChange("offer", at("rejected"), null)).toEqual({ change: "none" });
  });

  it("sets a new interview day on a card already in Interviewing", () => {
    const interviewing = { ...card("Acme", "Engineer", "interview"), interviewAt: 1 };
    expect(planChange("interview", interviewing, 2)).toEqual({ change: "dated", interviewAt: 2 });
    expect(planChange("interview", interviewing, 1)).toEqual({ change: "none" });
    expect(planChange("interview", interviewing, null)).toEqual({ change: "none" });
  });
});
