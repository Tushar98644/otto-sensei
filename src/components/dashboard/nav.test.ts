import { describe, expect, it } from "vitest";
import {
  APP_NAV,
  APP_NAV_FOOTER,
  isCurrent,
  PHONE_MORE,
  PHONE_TABS,
  showsProBadge,
  type AppNavItem,
} from "./nav";

const byLabel = (label: string): AppNavItem => {
  const item = [...APP_NAV, ...APP_NAV_FOOTER].find((entry) => entry.label === label);
  if (!item) throw new Error(`No nav item "${label}"`);
  return item;
};
const labels = (items: readonly AppNavItem[]) => items.map((item) => item.label);

describe("dashboard nav", () => {
  it("lists every section in the owner's order, with trash and account at the bottom", () => {
    expect(labels(APP_NAV)).toEqual([
      "Home",
      "Resumes",
      "Cover letters",
      "Jobs",
      "Applications",
      "Interview prep",
      "Portfolio",
      "Formats",
    ]);
    expect(labels(APP_NAV_FOOTER)).toEqual(["Recently deleted"]);
    expect(labels([...APP_NAV, ...APP_NAV_FOOTER])).not.toContain("Account");
    expect(labels(APP_NAV)).not.toContain("Tailor to a job");
  });

  it("gives every section its own page", () => {
    const hrefs = [...APP_NAV, ...APP_NAV_FOOTER].map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(byLabel("Cover letters").href).toBe("/dashboard/letters");
    expect(byLabel("Interview prep").href).toBe("/dashboard/interview");
  });

  it("puts Home, Resumes, Jobs and Applications on the phone strip and the rest under More", () => {
    expect(labels(PHONE_TABS)).toEqual(["Home", "Resumes", "Jobs", "Applications"]);
    expect(PHONE_TABS.map((item) => item.short ?? item.label)).toEqual([
      "Home",
      "Resumes",
      "Jobs",
      "Tracker",
    ]);
    expect(labels(PHONE_MORE)).toEqual([
      "Cover letters",
      "Interview prep",
      "Portfolio",
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

  it("marks the Pro sections, and shows the badge on Free only", () => {
    const pro = [...APP_NAV, ...APP_NAV_FOOTER]
      .filter((item) => item.pro)
      .map((item) => item.label);
    expect(pro).toEqual(["Cover letters", "Interview prep", "Portfolio"]);

    const letters = byLabel("Cover letters");
    expect(showsProBadge(letters, false)).toBe(true);
    expect(showsProBadge(letters, true)).toBe(false);
    expect(showsProBadge(letters, null)).toBe(false);
    expect(showsProBadge(byLabel("Formats"), false)).toBe(false);
    expect(showsProBadge(byLabel("Home"), false)).toBe(false);
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
    expect(isCurrent(byLabel("Cover letters"), "/dashboard/letters")).toBe(true);
    expect(isCurrent(byLabel("Jobs"), "/dashboard/resumes")).toBe(false);
  });
});
