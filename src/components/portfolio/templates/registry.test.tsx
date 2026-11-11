import { existsSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readMigrations } from "@/db/migration-files";
import { emptyContent, type PortfolioContentView } from "@/lib/portfolio/content";
import { contentView } from "@/lib/portfolio/content-view";
import { TEMPLATE_USES } from "@/lib/portfolio/content-uses";
import { DEFAULT_PORTFOLIO_TEMPLATE, PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { portfolioView, type PortfolioView } from "@/lib/portfolio/view";
import { emptyResume } from "@/lib/resume/schema";
import { PORTFOLIO_TEMPLATE_LIST, PORTFOLIO_TEMPLATES } from "./registry";

/** The selectors of every rule in the template's own <style>, at-rules and keyframes left out. */
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

/** The ids in the newest migration's CHECK on portfolios.template. */
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
  it("has the eight designs, in order, with a name, an idea, a credit and a picker picture", () => {
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
    ]);
    for (const template of PORTFOLIO_TEMPLATE_LIST) {
      expect(template.name).not.toBe("");
      expect(template.description.length).toBeGreaterThan(10);
      expect(existsSync(path.join(process.cwd(), "public", template.thumbnail)), template.id).toBe(
        true,
      );
      expect(template.credit.licence).toBe("MIT");
      expect(template.credit.href).toMatch(/^https:\/\/github\.com\//);
      // A template is named for its look, never after the person whose design it rebuilds.
      for (const word of template.credit.author.split(" "))
        expect(template.name.toLowerCase()).not.toContain(word.toLowerCase());
      expect(TEMPLATE_USES[template.id], template.id).toBeDefined();
    }
  });

  it("matches the database: the CHECK list and the default", () => {
    expect(migrationTemplateIds()).toEqual([...PORTFOLIO_TEMPLATE_IDS]);
    expect(DEFAULT_PORTFOLIO_TEMPLATE).toBe("navy");
    const latest = readMigrations()
      // The newest migration that changes the template list, not just any one touching portfolios.
      .filter((migration) => /portfolios_template_check/.test(migration.sql))
      .at(-1);
    expect(latest?.sql).toMatch(/alter column template set default 'navy'/);
  });
});

describe.each(PORTFOLIO_TEMPLATE_IDS)("the %s template", (id) => {
  const { Component, credit } = PORTFOLIO_TEMPLATES[id];
  const render = (data: { view: PortfolioView; content: PortfolioContentView }, footer?: string) =>
    renderToStaticMarkup(
      <Component
        view={data.view}
        content={data.content}
        footer={footer ? <span>{footer}</span> : undefined}
      />,
    );

  it("draws a page with only a name, and a plain word with none at all", () => {
    const html = render(onlyAName("Ada Lovelace"));
    // Dock greets by first name only, like its reference.
    expect(html).toContain(id === "dock" ? "Ada" : "Ada Lovelace");
    expect(html).not.toMatch(/<(section|article|ul)[^>]*>\s*<\/\1>/);
    expect(render(onlyAName(""))).toContain("Portfolio");
  });

  // The MIT notices for the rebuilt designs live in THIRD_PARTY_NOTICES.md, not on the page.
  it("shows no design credit, and draws the page's credit only when given one", () => {
    const html = render(onlyAName("Ada Lovelace"));
    expect(html).not.toContain("Design based on");
    expect(html).not.toContain(`href="${credit.href}"`);
    expect(render(onlyAName("Ada Lovelace"), "Made with Otto")).toContain("Made with Otto");
    expect(html).not.toContain("Made with Otto");
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
