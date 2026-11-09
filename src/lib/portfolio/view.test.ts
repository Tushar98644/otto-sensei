import { describe, expect, it } from "vitest";
import { planCopy, PORTFOLIO_PERK } from "@/app/(marketing)/_components/plan-features";
import { emptyResume } from "@/lib/resume/schema";
import { sampleResume } from "./testing";
import { canBuildPortfolio, canHideCredit, canPublishPortfolio, showsCredit } from "./plan";
import { DEFAULT_PORTFOLIO_SETTINGS } from "./types";
import { portfolioView, sectionsWithContent } from "./view";

const defaults = {
  showEmail: DEFAULT_PORTFOLIO_SETTINGS.showEmail,
  showPhone: DEFAULT_PORTFOLIO_SETTINGS.showPhone,
  hiddenSections: DEFAULT_PORTFOLIO_SETTINGS.hiddenSections,
};

describe("portfolioView", () => {
  it("fills the page from the resume: name, headline, intro, projects, jobs, skills", () => {
    const view = portfolioView(sampleResume(), defaults);
    expect(view.name).toBe("Maya Chen");
    expect(view.headline).toBe("Frontend engineer");
    expect(view.about).toEqual(["I build fast, friendly web apps.", "I like small teams."]);
    expect(view.projects).toEqual([
      expect.objectContaining({
        name: "otto-resume",
        href: "https://github.com/mayachen/otto-resume",
        host: "github.com",
        repo: "mayachen/otto-resume",
        lines: ["Parses 1,000 resumes a minute"],
      }),
    ]);
    expect(view.experience[0]).toMatchObject({
      dates: "Jan 2022 – Present",
      lines: ["Cut load time by 40%"],
    });
    expect(view.skills[0]?.items).toEqual(["React", "TypeScript"]);
  });

  it("hides email and phone by default and shows each only when turned on", () => {
    expect(DEFAULT_PORTFOLIO_SETTINGS).toMatchObject({ showEmail: false, showPhone: false });
    const hidden = portfolioView(sampleResume(), defaults);
    expect(hidden.email).toBeNull();
    expect(hidden.phone).toBeNull();
    expect(JSON.stringify(hidden)).not.toContain("maya@example.com");
    expect(JSON.stringify(hidden)).not.toContain("555");
    const email = portfolioView(sampleResume(), { ...defaults, showEmail: true });
    expect(email.email).toBe("maya@example.com");
    expect(email.phone).toBeNull();
  });

  it("leaves out hidden lines, hidden entries and the tailoring notes", () => {
    const text = JSON.stringify(portfolioView(sampleResume(), defaults));
    expect(text).not.toContain("Secret");
    expect(text).not.toContain("Hidden line");
    expect(text).not.toContain("Dear Acme");
    expect(text).not.toContain("2nd try");
  });

  it("hides whole sections the owner turned off", () => {
    const view = portfolioView(sampleResume(), {
      ...defaults,
      hiddenSections: ["projects", "about", "links"],
    });
    expect(view.projects).toEqual([]);
    expect(view.about).toEqual([]);
    expect(view.links).toEqual([]);
    expect(view.github).toBeNull();
    expect(view.experience).toHaveLength(1);
  });

  it("makes only web addresses clickable", () => {
    const view = portfolioView(sampleResume(), defaults);
    const linkedin = view.links.find((link) => link.kind === "linkedin");
    expect(linkedin?.href).toBe("https://linkedin.com/in/mayachen");
    const unsafe = view.links.find((link) => link.label === "Site");
    expect(unsafe?.href).toBeNull();
  });

  it("puts GitHub up front, from the links or from imported repos", () => {
    expect(portfolioView(sampleResume(), defaults).github).toMatchObject({
      text: "github.com/mayachen",
      href: "https://github.com/mayachen",
    });
    const own = sampleResume();
    own.basics.links.push({ id: "l3", label: "GitHub", url: "https://github.com/maya" });
    expect(portfolioView(own, defaults).github?.href).toBe("https://github.com/maya");
    expect(portfolioView(sampleResume({ projects: [] }), defaults).github).toBeNull();
  });

  it("offers only the sections the resume has something for", () => {
    const sections = sectionsWithContent(sampleResume());
    expect(sections).toEqual(["about", "projects", "experience", "skills", "links"]);
    expect(sectionsWithContent(emptyResume())).toEqual([]);
  });
});

describe("pictures and dates", () => {
  it("gives a project its owner's picture only when the address is safe", () => {
    const view = portfolioView(sampleResume(), {
      ...defaults,
      projectImages: {
        p1: "https://cdn.example.com/otto.png",
        p2: "https://cdn.example.com/secret.png",
      },
    });
    expect(view.projects).toMatchObject([{ id: "p1", image: "https://cdn.example.com/otto.png" }]);
    const unsafe = portfolioView(sampleResume(), {
      ...defaults,
      projectImages: { p1: "http://cdn.example.com/a.png" },
    });
    expect(unsafe.projects[0]?.image).toBeNull();
    expect(portfolioView(sampleResume(), defaults).projects[0]?.image).toBeNull();
  });

  it("keeps start and end dates apart, and when the resume changed", () => {
    const view = portfolioView(sampleResume(), defaults);
    expect(view.experience[0]).toMatchObject({
      start: "Jan 2022",
      end: "Present",
      dates: "Jan 2022 – Present",
    });
    expect(view.updatedAt).toBe(1_000);
  });
});

describe("plan perk", () => {
  it("lets Pro and Max hide the credit line, and never Free", () => {
    expect(canHideCredit("free")).toBe(false);
    expect(canHideCredit("pro")).toBe(true);
    expect(canHideCredit("max")).toBe(true);
    expect(showsCredit(true, "free")).toBe(true);
    expect(showsCredit(true, "pro")).toBe(false);
    expect(showsCredit(false, "max")).toBe(true);
  });

  it("lists the portfolio and its perk on Pro, and neither on Free (portfolios are Pro and Max)", () => {
    expect(planCopy("pro").features).toContain(PORTFOLIO_PERK);
    expect(planCopy("pro", "week").features).toContain(PORTFOLIO_PERK);
    expect(planCopy("pro").features.some((line) => /portfolio page/i.test(line))).toBe(true);
    expect(planCopy("free").features.some((line) => /portfolio/i.test(line))).toBe(false);
  });

  it("builds on any paid plan, a trial included, and publishes only on a paid one", () => {
    expect(canBuildPortfolio("free")).toBe(false);
    expect(canBuildPortfolio("pro")).toBe(true);
    expect(canPublishPortfolio("pro", true)).toBe(false);
    expect(canPublishPortfolio("pro", false)).toBe(true);
    expect(canPublishPortfolio("max", false)).toBe(true);
    expect(canPublishPortfolio("free", false)).toBe(false);
  });
});
