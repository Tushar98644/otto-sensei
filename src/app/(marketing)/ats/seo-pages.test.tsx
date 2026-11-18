import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/components/site/routes";
import { HIRING_SYSTEMS } from "@/lib/ats/systems";
import { ATS_IDS, atsGuide, guideHeadline } from "@/lib/seo-pages/ats";
import { COMPETITORS } from "@/lib/seo-pages/compare";
import { seoPages } from "@/lib/seo-pages/pages";
import { SEO_PATHS, atsPath } from "@/lib/seo-pages/paths";
import { TEMPLATE_LIST } from "@/lib/pdf/templates";
import ComparePage, { generateMetadata as compareMetadata } from "../compare/[competitor]/page";
import CompareIndexPage from "../compare/page";
import ResumeTemplatesPage from "../resume-templates/page";
import AtsGuidePage, { generateMetadata as guideMetadata } from "./[system]/page";
import AtsGuidesPage from "./page";

vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  useRouter: () => ({ prefetch: () => {}, push: () => {} }),
}));

const decode = (html: string) =>
  html
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const anchors = (html: string) => [...html.matchAll(/<a [^>]*>/g)].map((match) => match[0]);
const hrefOf = (tag: string) => decode(/href="([^"]+)"/.exec(tag)?.[1] ?? "");

const INTERNAL = new Set<string>([
  ROUTES.home,
  ROUTES.studio,
  ROUTES.pricing,
  SEO_PATHS.jobMatch,
  ...seoPages().map((page) => page.path),
  ...ATS_IDS.map(atsPath),
]);

function checkPage(html: string) {
  expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
  expect(html).not.toMatch(/<main[\s>]/);
  expect(html).toContain('"@type":"BreadcrumbList"');
  for (const tag of anchors(html)) {
    const href = hrefOf(tag);
    if (href.startsWith("#") || href.startsWith("mailto:")) continue;
    if (href.startsWith("https://")) {
      expect(tag, href).toContain('target="_blank"');
      expect(tag, href).toContain('rel="noopener noreferrer"');
      continue;
    }
    expect(INTERNAL.has(href), href).toBe(true);
  }
}

const guide = (system: string) => AtsGuidePage({ params: Promise.resolve({ system }) });
const comparison = (competitor: string) => ComparePage({ params: Promise.resolve({ competitor }) });
const render = async (page: Promise<ReactElement> | ReactElement) =>
  renderToStaticMarkup(await page);

describe("ATS guide pages", () => {
  it.each(Object.keys(HIRING_SYSTEMS))("%s shows every sourced note and its source", async (id) => {
    const html = await render(guide(id));
    checkPage(html);
    const system = HIRING_SYSTEMS[id as keyof typeof HIRING_SYSTEMS];
    expect(text(html)).toContain(guideHeadline(atsGuide(system.id)));
    for (const note of system.notes) {
      expect(text(html)).toContain(note.fact);
      expect(text(html)).toContain(note.todo);
      expect(html).toContain(`href="${note.source.url.replace(/&/g, "&amp;")}"`);
    }
    expect(html).toContain(`href="${SEO_PATHS.jobMatch}"`);
    expect(html).toContain(`href="${ROUTES.studio}"`);
  });

  it("says so when Otto has nothing sourced on how a system reads files", async () => {
    expect(text(await render(guide("lever")))).toContain(
      "Otto's notes don't cover how Lever reads files yet",
    );
    expect(text(await render(guide("greenhouse")))).not.toContain("don't cover how");
  });

  it("refuses a system it has no notes on", async () => {
    await expect(guide("linkedin")).rejects.toThrow();
  });

  it("sets the canonical path and title from the guide", async () => {
    const meta = await guideMetadata({ params: Promise.resolve({ system: "workday" }) });
    expect(meta.alternates?.canonical).toBe("/ats/workday");
    expect(meta.title).toBe("Workday ATS: how it reads your resume");
    expect(meta.robots).toBeUndefined();
  });

  it("names what a thin guide covers, and keeps it out of search", async () => {
    const meta = await guideMetadata({ params: Promise.resolve({ system: "lever" }) });
    expect(meta.title).toBe("Lever ATS: what it does with your application");
    expect(meta.robots).toEqual({ index: false, follow: true });
    const words = text(await render(guide("lever")));
    expect(words).toContain("What Lever does with your application");
    expect(words).not.toContain("How Lever reads your resume");
  });

  it("links every guide from the index", async () => {
    const html = await render(<AtsGuidesPage />);
    checkPage(html);
    for (const id of Object.keys(HIRING_SYSTEMS)) expect(html).toContain(`href="/ats/${id}"`);
  });
});

describe("comparison pages", () => {
  it.each(COMPETITORS.map((c) => c.slug))("%s shows both sides and its sources", async (slug) => {
    const competitor = COMPETITORS.find((c) => c.slug === slug)!;
    const html = await render(comparison(slug));
    checkPage(html);
    const words = text(html);
    expect(words).toContain(`Otto Sensei vs ${competitor.name}`);
    expect(words).toContain("November 18, 2026");
    for (const row of competitor.rows) {
      expect(words).toContain(row.otto);
      expect(words).toContain(row.them);
    }
    for (const strength of competitor.strengths) expect(words).toContain(strength);
    for (const note of [...competitor.differences, ...competitor.extras]) {
      expect(words).toContain(note.text);
    }
    expect(words).toContain("Also in Otto Sensei");
    for (const source of competitor.sources) expect(html).toContain(`href="${source.url}"`);
    expect(words).toContain(`${competitor.name} is a trademark of its owner`);
  });

  it("refuses a product it hasn't checked", async () => {
    await expect(comparison("teal")).rejects.toThrow();
  });

  it("sets the canonical path from the slug, with the title as written", async () => {
    const meta = await compareMetadata({ params: Promise.resolve({ competitor: "rezi" }) });
    expect(meta.alternates?.canonical).toBe("/compare/rezi");
    expect(meta.title).toEqual({ absolute: "Otto Sensei vs Rezi" });
    expect(meta.openGraph?.title).toBe("Otto Sensei vs Rezi");
  });

  it("links every comparison from the index", async () => {
    const html = await render(<CompareIndexPage />);
    checkPage(html);
    for (const { slug } of COMPETITORS) expect(html).toContain(`href="/compare/${slug}"`);
  });
});

describe("resume templates page", () => {
  const html = renderToStaticMarkup(<ResumeTemplatesPage />);

  it("shows each format, says which are free, and offers each one", () => {
    checkPage(html);
    const words = text(html);
    for (const info of TEMPLATE_LIST) {
      expect(html).toContain(`id="format-${info.id}"`);
      expect(words).toContain(info.description);
    }
    expect(html.match(/>Use this format</g)).toHaveLength(TEMPLATE_LIST.length);
    for (const info of TEMPLATE_LIST) {
      expect(html).toContain(`Use this format<span class="sr-only">: ${info.name}</span>`);
    }
    expect(words).not.toMatch(/reads every one/i);
    expect(html.match(/>Free</g)).toHaveLength(2);
    expect(html.match(/>Pro</g)).toHaveLength(TEMPLATE_LIST.length - 2);
  });

  it("loads only the first row of previews up front", () => {
    expect(html.match(/loading="lazy"/g)).toHaveLength(TEMPLATE_LIST.length - 3);
  });
});
