import { describe, expect, it } from "vitest";
import {
  APP_NAV,
  APP_NAV_FOOTER,
  isCurrent,
  PHONE_MORE,
  PHONE_TABS,
  showsProMark,
  type AppNavItem,
} from "./nav";

const byLabel = (label: string): AppNavItem => {
  const item = [...APP_NAV, ...APP_NAV_FOOTER].find((entry) => entry.label === label);
  if (!item) throw new Error(`No nav item "${label}"`);
  return item;
};
const labels = (items: readonly AppNavItem[]) => items.map((item) => item.label);

describe("dashboard nav", () => {
  it("lists the main sections in order, with Formats and trash in the quieter group", () => {
    expect(labels(APP_NAV)).toEqual([
      "Home",
      "Resumes",
      "Jobs",
      "Applications",
      "Letters",
      "Interview prep",
      "Portfolio",
      "Career log",
    ]);
    expect(labels(APP_NAV_FOOTER)).toEqual(["Formats", "Recently deleted"]);
    expect(labels([...APP_NAV, ...APP_NAV_FOOTER])).not.toContain("Account");
    expect(labels(APP_NAV)).not.toContain("Tailor to a job");
  });

  it("gives every section one name and its own page", () => {
    const all = [...APP_NAV, ...APP_NAV_FOOTER];
    const hrefs = all.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(byLabel("Letters").href).toBe("/dashboard/letters");
    expect(byLabel("Applications").href).toBe("/dashboard/applications");
    expect(byLabel("Interview prep").href).toBe("/dashboard/interview");
    for (const item of all) expect(Object.keys(item)).not.toContain("short");
  });

  it("puts Home, Resumes, Jobs and Applications on the phone strip and the rest under More", () => {
    expect(labels(PHONE_TABS)).toEqual(["Home", "Resumes", "Jobs", "Applications"]);
    expect(labels(PHONE_MORE)).toEqual([
      "Letters",
      "Interview prep",
      "Portfolio",
      "Career log",
      "Formats",
      "Recently deleted",
    ]);
  });

  it("reaches every section from a phone exactly once", () => {
    const phone = [...PHONE_TABS, ...PHONE_MORE].map((item) => item.href);
    const all = [...APP_NAV, ...APP_NAV_FOOTER].map((item) => item.href);
    expect(new Set(phone).size).toBe(phone.length);
    expect([...phone].sort()).toEqual([...all].sort());
  });

  it("marks the Pro sections, on Free only and never while the plan loads", () => {
    const pro = [...APP_NAV, ...APP_NAV_FOOTER]
      .filter((item) => item.pro)
      .map((item) => item.label);
    expect(pro).toEqual(["Letters", "Interview prep", "Portfolio"]);

    const letters = byLabel("Letters");
    expect(showsProMark(letters, false)).toBe(true);
    expect(showsProMark(letters, true)).toBe(false);
    expect(showsProMark(letters, null)).toBe(false);
    expect(showsProMark(byLabel("Formats"), false)).toBe(false);
    expect(showsProMark(byLabel("Home"), false)).toBe(false);
  });
});

describe("isCurrent", () => {
  it("matches Home only on the dashboard itself", () => {
    expect(isCurrent(byLabel("Home"), "/dashboard")).toBe(true);
    expect(isCurrent(byLabel("Home"), "/dashboard/resumes")).toBe(false);
  });

  it("matches a section and its sub-pages, but not look-alike paths", () => {
    expect(isCurrent(byLabel("Resumes"), "/dashboard/resumes")).toBe(true);
    expect(isCurrent(byLabel("Formats"), "/dashboard/formats/modern")).toBe(true);
    expect(isCurrent(byLabel("Resumes"), "/dashboard/resumes-old")).toBe(false);
    expect(isCurrent(byLabel("Applications"), "/dashboard/applications")).toBe(true);
    expect(isCurrent(byLabel("Interview prep"), "/dashboard/interview/0b9f")).toBe(true);
    expect(isCurrent(byLabel("Letters"), "/dashboard/letters")).toBe(true);
    expect(isCurrent(byLabel("Jobs"), "/dashboard/resumes")).toBe(false);
  });
});
