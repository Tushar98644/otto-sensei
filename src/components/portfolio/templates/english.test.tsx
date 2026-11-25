import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { englishMessages } from "@/i18n/messages";
import { emptyContent } from "@/lib/portfolio/content";
import { contentView } from "@/lib/portfolio/content-view";
import { jordanContent, jordanGitHub, jordanV2Resume } from "@/lib/portfolio/fixtures/jordan";
import { PORTFOLIO_TEMPLATE_IDS, type PortfolioTemplateId } from "@/lib/portfolio/types";
import { portfolioView, type ViewSettings } from "@/lib/portfolio/view";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { loadTemplate } from "./lazy";
import { PORTFOLIO_TEMPLATES } from "./registry";

// Each design drawn in English, hashed against golden/english.json, saved before the designs read their words from the messages.

const NOW = Date.UTC(2026, 10, 8, 12);
const GOLDEN: Record<string, string> = JSON.parse(
  readFileSync(new URL("./golden/english.json", import.meta.url), "utf8"),
);
const OPEN: ViewSettings = { showEmail: true, showPhone: false, hiddenSections: [] };

function named(name: string): Resume {
  const resume = emptyResume(1);
  resume.basics.name = name;
  return resume;
}

type Variant = {
  resume: () => Resume;
  settings: ViewSettings;
  full: boolean;
  github: boolean;
  footer: boolean;
  resumeHref: string | null;
};

const VARIANTS: Record<string, Variant> = {
  full: {
    resume: jordanV2Resume,
    settings: OPEN,
    full: true,
    github: true,
    footer: true,
    resumeHref: "/s/AbCdEfGhJkLmNp",
  },
  private: {
    resume: jordanV2Resume,
    settings: { showEmail: false, showPhone: true, hiddenSections: [] },
    full: true,
    github: false,
    footer: false,
    resumeHref: null,
  },
  bare: {
    resume: () => named("Ada Lovelace"),
    settings: OPEN,
    full: false,
    github: false,
    footer: false,
    resumeHref: "/s/AbCdEfGhJkLmNp",
  },
  empty: {
    resume: () => named(""),
    settings: OPEN,
    full: false,
    github: false,
    footer: true,
    resumeHref: null,
  },
};

function draw(id: PortfolioTemplateId, variant: Variant): string {
  const view = portfolioView(variant.resume(), variant.settings);
  const content = contentView({
    view,
    content: variant.full ? jordanContent() : emptyContent(),
    github: variant.github ? jordanGitHub() : null,
    now: NOW,
  });
  const { Component } = PORTFOLIO_TEMPLATES[id];
  return renderToStaticMarkup(
    <Component
      view={view}
      content={content}
      words={englishMessages().portfolioDesigns}
      footer={variant.footer ? <span>Made with Otto</span> : undefined}
      resumeHref={variant.resumeHref}
    />,
  );
}

// React's empty text separators (<!-- -->) move when copy becomes one message; nothing else may change.
const hashOf = (html: string) =>
  createHash("sha256").update(html.replaceAll("<!-- -->", "")).digest("hex");

beforeAll(async () => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  await Promise.all(PORTFOLIO_TEMPLATE_IDS.map(loadTemplate));
});

afterAll(() => {
  vi.useRealTimers();
});

describe.each(PORTFOLIO_TEMPLATE_IDS)("the %s design in English", (id) => {
  it.each(Object.keys(VARIANTS))("draws the %s page as it always has", (name) => {
    expect(hashOf(draw(id, VARIANTS[name]!)), `${id}.${name}`).toBe(GOLDEN[`${id}.${name}`]);
  });
});
