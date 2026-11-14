import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { emptyContent } from "@/lib/portfolio/content";
import { contentView } from "@/lib/portfolio/content-view";
import { jordanContent, jordanGitHub, jordanV2Resume } from "@/lib/portfolio/fixtures/jordan";
import { PORTFOLIO_TEMPLATE_INFO, templateOrder } from "@/lib/portfolio/templates";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { portfolioView } from "@/lib/portfolio/view";
import { FullPortfolioPreview } from "./full-preview";
import type { TemplateSample } from "./live-template";
import { loadTemplate } from "./templates/lazy";

const noop = () => {};

function draw(id: (typeof PORTFOLIO_TEMPLATE_IDS)[number], own: TemplateSample | null = null) {
  return renderToStaticMarkup(
    <FullPortfolioPreview
      id={id}
      own={own}
      action={{ label: "Try Pro for 3 days", onSelect: noop }}
      onChange={noop}
      onClose={noop}
    />,
  );
}

function samsPage(full: boolean): TemplateSample {
  const resume = jordanV2Resume();
  resume.basics.name = "Sam Rivera";
  if (!full) {
    resume.summary = "";
    resume.projects = resume.projects.slice(0, 1);
    resume.experience = [];
  }
  const view = portfolioView(resume, { showEmail: false, showPhone: false, hiddenSections: [] });
  return {
    view,
    content: contentView({
      view,
      content: full ? jordanContent() : emptyContent(),
      github: full ? jordanGitHub() : null,
    }),
  };
}

const SAMPLE_NOTE = "Sample page:</span> Jordan Ellis, a made-up person";

describe("FullPortfolioPreview before a design's code is here", () => {
  it("shows the bar and fills the page with the design's background until it arrives", () => {
    const html = draw("bento");
    expect(html).toContain("Bento");
    expect(html).toContain("Try Pro for 3 days");
    expect(html).toContain(`background-color:${PORTFOLIO_TEMPLATE_INFO.bento.colors.background}`);
    expect(html).not.toContain('class="pf-bento"');
  });
});

describe("FullPortfolioPreview", () => {
  beforeAll(async () => {
    await Promise.all(PORTFOLIO_TEMPLATE_IDS.map((id) => loadTemplate(id)));
  });

  it("draws every design at full size, with its place in the set and the way to go live", () => {
    templateOrder(PORTFOLIO_TEMPLATE_IDS).forEach((id, index) => {
      const html = draw(id);
      expect(html).toContain(`class="pf-${id}"`);
      expect(html).toContain(PORTFOLIO_TEMPLATE_INFO[id].name);
      expect(html).toContain(`${index + 1} of ${PORTFOLIO_TEMPLATE_IDS.length}`);
      expect(html).toContain("Jordan Ellis");
      expect(html).toContain(SAMPLE_NOTE);
      expect(html).toContain("Try Pro for 3 days");
      expect(html).toContain("Preview only: not live yet.");
    });
  });

  it("is a live page, not a still picture: nothing in it is inert", () => {
    expect(draw("navy")).not.toContain("inert");
  });

  it("offers no switch to someone without a page of their own", () => {
    expect(draw("navy")).not.toContain("Your page");
  });

  it("starts on the sample when the person's own page is thin, with the switch to theirs", () => {
    const html = draw("navy", samsPage(false));
    expect(html).toContain(SAMPLE_NOTE);
    expect(html).toContain("Jordan Ellis");
    expect(html).not.toContain("Sam Rivera");
    expect(html).toMatch(/aria-pressed="true"[^>]*>Sample page</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Your page</);
  });

  it("starts on their own page when it has enough in it", () => {
    const html = draw("navy", samsPage(true));
    expect(html).toContain("Sam Rivera");
    expect(html).not.toContain(SAMPLE_NOTE);
    expect(html).toContain("Your page, with your own content");
    expect(html).toMatch(/aria-pressed="true"[^>]*>Your page</);
  });
});
