import { existsSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { readMigrations } from "@/db/migration-files";
import { englishMessages } from "@/i18n/messages";
import { emptyContent, type PortfolioContentView } from "@/lib/portfolio/content";
import { contentView } from "@/lib/portfolio/content-view";
import { TEMPLATE_USES } from "@/lib/portfolio/content-uses";
import { templateOrder } from "@/lib/portfolio/templates";
import { DEFAULT_PORTFOLIO_TEMPLATE, PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { portfolioView, type PortfolioView } from "@/lib/portfolio/view";
import { emptyResume } from "@/lib/resume/schema";
import { loadTemplate } from "./lazy";
import { PORTFOLIO_TEMPLATE_LIST, PORTFOLIO_TEMPLATES } from "./registry";

// Each design's islands come in their own chunk; loading the designs brings them in.
beforeAll(() => Promise.all(PORTFOLIO_TEMPLATE_IDS.map(loadTemplate)));

function selectorsOf(html: string): string[] {
  const css = (/<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? "").replace(
    /@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g,
    "",
  );
  const selectors: string[] = [];
  for (const match of css.matchAll(/(?:^|[{}])\s*([^{}@]+?)\s*\{/g)) {
    selectors.push(...(match[1] ?? "").split(/,(?![^(]*\))/).map((part) => part.trim()));
  }
  return selectors.filter(Boolean);
}

function migrationTemplateIds(): string[] {
  const checks = readMigrations()
    .map((migration) => /check\s*\(\s*template\s+in\s*\(([^)]*)\)\s*\)/i.exec(migration.sql)?.[1])
    .filter((list): list is string => Boolean(list));
  const latest = checks.at(-1) ?? "";
  return [...latest.matchAll(/'([a-z]+)'/g)].map((match) => match[1] ?? "");
}

function onlyAName(name: string) {
  const resume = { ...emptyResume(1), basics: { ...emptyResume(1).basics, name } };
  const view = portfolioView(resume, { showEmail: true, showPhone: true, hiddenSections: [] });
  return {
    view,
    content: contentView({ view, content: emptyContent(), github: null }),
  };
}

describe("portfolio template registry", () => {
  it("has the fifteen designs, in order, with a name, an idea, a credit and a picker picture", () => {
    expect(PORTFOLIO_TEMPLATE_LIST.map((template) => template.id)).toEqual([
      ...PORTFOLIO_TEMPLATE_IDS,
    ]);
    expect(PORTFOLIO_TEMPLATE_IDS).toEqual([
      "navy",
      "dock",
      "reel",
      "bento",
      "cv",
      "prose",
      "folio",
      "paper",
      "gazette",
      "terminal",
      "brutal",
      "card",
      "retro",
      "starring",
      "bubble",
    ]);
    for (const template of PORTFOLIO_TEMPLATE_LIST) {
      expect(template.name).not.toBe("");
      expect(template.description.length).toBeGreaterThan(10);
      expect(existsSync(path.join(process.cwd(), "public", template.thumbnail)), template.id).toBe(
        true,
      );
      expect(template.credit.licence).toBe("MIT");
      expect(template.credit.href).toMatch(/^https:\/\/github\.com\//);
      for (const word of template.credit.author.split(" "))
        expect(template.name.toLowerCase()).not.toContain(word.toLowerCase());
      expect(TEMPLATE_USES[template.id], template.id).toBeDefined();
    }
  });

  it("matches the database: the CHECK list, in picker order, and the default", () => {
    expect(migrationTemplateIds()).toEqual(templateOrder(PORTFOLIO_TEMPLATE_IDS));
    expect(DEFAULT_PORTFOLIO_TEMPLATE).toBe("navy");
    const latest = readMigrations()
      .filter((migration) => /add constraint portfolios_template_check/.test(migration.sql))
      .at(-1);
    expect(latest?.sql).toMatch(/alter column template set default 'navy'/);
  });
});

describe.each(PORTFOLIO_TEMPLATE_IDS)("the %s template", (id) => {
  const { Component, credit } = PORTFOLIO_TEMPLATES[id];
  const render = (
    data: { view: PortfolioView; content: PortfolioContentView },
    footer?: string,
    resumeHref?: string,
  ) =>
    renderToStaticMarkup(
      <Component
        view={data.view}
        content={data.content}
        words={englishMessages().portfolioDesigns}
        footer={footer ? <span>{footer}</span> : undefined}
        resumeHref={resumeHref}
      />,
    );

  it("draws a page with only a name, and a plain word with none at all", () => {
    const html = render(onlyAName("Ada Lovelace"));
    expect(html).toContain(id === "dock" ? "Ada" : "Ada Lovelace");
    expect(html).not.toMatch(/<(section|article|ul)[^>]*>\s*<\/\1>/);
    expect(render(onlyAName(""))).toContain("Portfolio");
  });

  it("shows no design credit, and draws the page's credit only when given one", () => {
    const html = render(onlyAName("Ada Lovelace"));
    expect(html).not.toContain("Design based on");
    expect(html).not.toContain(`href="${credit.href}"`);
    expect(render(onlyAName("Ada Lovelace"), "Made with Otto")).toContain("Made with Otto");
    expect(html).not.toContain("Made with Otto");
  });

  it("links the owner's shared resume only when there is one", () => {
    const html = render(onlyAName("Ada Lovelace"), undefined, "/s/AbCdEfGhJkLmNp");
    expect(html).toMatch(/<a[^>]*href="\/s\/AbCdEfGhJkLmNp"/);
    expect(html).toContain("Resume");
    expect(html).not.toMatch(/<(section|article|ul)[^>]*>\s*<\/\1>/);
    expect(render(onlyAName("Ada Lovelace"))).not.toContain("/s/");
  });

  it("scopes every rule of its stylesheet to its own root", () => {
    const html = render(onlyAName("Ada Lovelace"));
    const root = `.pf-${id}`;
    expect(html).toMatch(new RegExp(`class="pf-${id}"`));
    const selectors = selectorsOf(html);
    expect(selectors.length).toBeGreaterThan(5);
    for (const selector of selectors)
      expect(selector, selector).toMatch(new RegExp(`^\\${root}(?![\\w-])`));
  });
});
