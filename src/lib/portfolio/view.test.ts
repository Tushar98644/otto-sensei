import { describe, expect, it } from "vitest";
import { planCopy as planCopyIn } from "@/app/[lang]/(marketing)/_components/plan-features";
import type { AllowancePeriod, PlanId } from "@/config/plans";
import { formatFor } from "@/i18n/intl";
import { englishMessages } from "@/i18n/messages";
import { emptyResume } from "@/lib/resume/schema";
import { sampleResume } from "./testing";
import { canBuildPortfolio, canPublishPortfolio } from "./plan";
import { DEFAULT_PORTFOLIO_SETTINGS } from "./types";
import { portfolioView, sectionsWithContent } from "./view";

const planCopy = (plan: PlanId, period?: AllowancePeriod) =>
  planCopyIn(englishMessages().pricing, formatFor("en"), plan, period);

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

  it("keeps an imported contact line out of the About, and hidden details out of its prose", () => {
    const resume = sampleResume({
      summary: [
        "\u0087 github.com/maya | ° linkedin.com/in/mayachen | portfolio/maya | > maya@example.com | Ó +1 415 555 0100",
        "I build fast, friendly web apps. Write to me at maya@example.com.",
      ].join("\n"),
    });
    const about = portfolioView(resume, defaults).about;
    expect(about).toHaveLength(1);
    expect(about[0]).toMatch(/^I build fast, friendly web apps\./);
    expect(JSON.stringify(about)).not.toMatch(/maya@example\.com|555 0100/);
    expect(portfolioView(resume, { ...defaults, showEmail: true }).about).toEqual([
      "I build fast, friendly web apps. Write to me at maya@example.com.",
    ]);
  });

  it("drops a headline that is only a link's text", () => {
    const resume = (headline: string) =>
      sampleResume({ basics: { ...sampleResume().basics, headline } });
    expect(portfolioView(resume("portfolio/maya"), defaults).headline).toBe("");
    expect(portfolioView(resume("bit.ly/Maya-CV"), defaults).headline).toBe("");
    expect(portfolioView(resume("Designer/Developer"), defaults).headline).toBe(
      "Designer/Developer",
    );
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

describe("no pictures, and dates", () => {
  it("never gives a project a picture: pages are text only", () => {
    const view = portfolioView(sampleResume(), defaults);
    for (const project of view.projects) expect(project).not.toHaveProperty("image");
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
  it("lists the portfolio on Pro, and not on Free (portfolios are Pro and Max)", () => {
    expect(planCopy("pro").features.some((line) => /portfolio site/i.test(line))).toBe(true);
    expect(planCopy("pro", "month").features.some((line) => /portfolio site/i.test(line))).toBe(
      true,
    );
    expect(planCopy("free").features.some((line) => /portfolio/i.test(line))).toBe(false);
  });

  it("builds and publishes on any paid plan, a trial included", () => {
    expect(canBuildPortfolio("free")).toBe(false);
    expect(canBuildPortfolio("pro")).toBe(true);
    expect(canPublishPortfolio("pro")).toBe(true);
    expect(canPublishPortfolio("max")).toBe(true);
    expect(canPublishPortfolio("free")).toBe(false);
  });
});
