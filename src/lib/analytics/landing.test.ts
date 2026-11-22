import { describe, expect, it } from "vitest";
import { dashboardSection, emailLanding, emailLink, withoutUtm } from "./landing";

describe("dashboardSection", () => {
  it("names each dashboard page", () => {
    expect(dashboardSection("/dashboard")).toBe("home");
    expect(dashboardSection("/dashboard/")).toBe("home");
    expect(dashboardSection("/dashboard/resumes")).toBe("resumes");
    expect(dashboardSection("/dashboard/jobs")).toBe("jobs");
    expect(dashboardSection("/dashboard/applications")).toBe("applications");
    expect(dashboardSection("/dashboard/letters")).toBe("letters");
    expect(dashboardSection("/dashboard/interview")).toBe("interview");
    expect(dashboardSection("/dashboard/portfolio")).toBe("portfolio");
    expect(dashboardSection("/dashboard/formats")).toBe("formats");
    expect(dashboardSection("/dashboard/account")).toBe("account");
    expect(dashboardSection("/dashboard/trash")).toBe("trash");
  });

  it("names a page about one thing without its id", () => {
    const id = "6f1c2a8e-0b7d-4c55-9a3e-2d4f6b8a1c9e";
    expect(dashboardSection(`/dashboard/applications/${id}`)).toBe("application");
    expect(dashboardSection(`/dashboard/applications/${id}/prep`)).toBe("prep");
    expect(dashboardSection(`/dashboard/interview/${id}`)).toBe("interview_pack");
  });

  it("counts the studio and the plan page, and nothing else", () => {
    expect(dashboardSection("/studio")).toBe("studio");
    expect(dashboardSection("/account")).toBe("billing");
    expect(dashboardSection("/")).toBeNull();
    expect(dashboardSection("/pricing")).toBeNull();
    expect(dashboardSection("/s/abc123")).toBeNull();
    expect(dashboardSection("/p/maya")).toBeNull();
    expect(dashboardSection("/dashboard/nope")).toBeNull();
    expect(dashboardSection("/dashboard/applications/x/notes")).toBeNull();
    expect(dashboardSection("/dashboardish")).toBeNull();
  });

  it("ignores the query and hash", () => {
    expect(dashboardSection("/dashboard/jobs?tailor=1#top")).toBe("jobs");
  });
});

describe("emailLink and emailLanding", () => {
  it("tags a link with our source, the email and which link it was", () => {
    const tagged = emailLink("https://otto.example/dashboard/jobs", "weekly_jobs", "tailor");
    const url = new URL(tagged);
    expect(url.pathname).toBe("/dashboard/jobs");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: "otto",
      utm_medium: "email",
      utm_campaign: "weekly_jobs",
      utm_content: "tailor",
    });
    expect(emailLanding(url.search)).toEqual({ campaign: "weekly_jobs", link: "tailor" });
  });

  it("keeps the link's own query and hash", () => {
    const tagged = emailLink(
      "https://otto.example/dashboard/account?x=1#reminders",
      "tips",
      "settings",
    );
    const url = new URL(tagged);
    expect(url.hash).toBe("#reminders");
    expect(url.searchParams.get("x")).toBe("1");
  });

  it("leaves out a link name that isn't a plain slug", () => {
    const tagged = emailLink("https://otto.example/dashboard", "tips", "Jane Doe");
    expect(new URL(tagged).searchParams.has("utm_content")).toBe(false);
    expect(emailLanding(new URL(tagged).search)).toEqual({ campaign: "tips" });
  });

  it("only trusts our own tags", () => {
    expect(emailLanding("")).toBeNull();
    expect(emailLanding("?utm_source=newsletter&utm_medium=email&utm_campaign=tips")).toBeNull();
    expect(emailLanding("?utm_source=otto&utm_medium=social&utm_campaign=tips")).toBeNull();
    expect(emailLanding("?utm_source=otto&utm_medium=email&utm_campaign=spam")).toBeNull();
    expect(
      emailLanding("?utm_source=otto&utm_medium=email&utm_campaign=tips&utm_content=a%40b.co"),
    ).toEqual({ campaign: "tips" });
  });

  it("takes the tags off an address and keeps the rest", () => {
    const tagged = emailLink(
      "https://otto.example/dashboard/jobs?tailor=42",
      "weekly_jobs",
      "jobs",
    );
    expect(withoutUtm(`${tagged}#top`)).toBe("https://otto.example/dashboard/jobs?tailor=42#top");
  });
});
