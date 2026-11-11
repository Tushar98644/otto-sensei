import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { contentView } from "@/lib/portfolio/content-view";
import { emptyContent, type PortfolioContent, type ProjectEntry } from "@/lib/portfolio/content";
import { jordanContent, jordanGitHub, jordanV2Resume } from "@/lib/portfolio/fixtures/jordan";
import { PORTFOLIO_SECTIONS, type PortfolioTemplateId } from "@/lib/portfolio/types";
import { portfolioView, type ViewSettings } from "@/lib/portfolio/view";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { PORTFOLIO_TEMPLATES } from "./registry";

const NOW = Date.UTC(2026, 10, 8);
const OPEN: ViewSettings = { showEmail: true, showPhone: false, hiddenSections: [] };

function draw(id: PortfolioTemplateId, resume: Resume, settings = OPEN, full = true) {
  const view = portfolioView(resume, settings);
  const content = contentView({
    view,
    content: full ? jordanContent() : emptyContent(),
    github: full ? jordanGitHub() : null,
    now: NOW,
  });
  const { Component } = PORTFOLIO_TEMPLATES[id];
  return renderToStaticMarkup(
    <Component view={view} content={content} footer={<span>Made with Otto</span>} />,
  );
}

function drawEdited(id: PortfolioTemplateId, edit: (project: ProjectEntry) => ProjectEntry) {
  const view = portfolioView(jordanV2Resume(), OPEN);
  const fixture = jordanContent();
  const edited: PortfolioContent = { ...fixture, projects: fixture.projects.map(edit) };
  const content = contentView({ view, content: edited, github: jordanGitHub(), now: NOW });
  const { Component } = PORTFOLIO_TEMPLATES[id];
  return renderToStaticMarkup(<Component view={view} content={content} />);
}

const SHOWS: Record<PortfolioTemplateId, string[]> = {
  navy: [
    "Jordan Ellis",
    "Full-stack engineer",
    "Tally",
    "Shiftboard",
    "Ledgerly",
    "Tripwise",
    "TypeScript",
    "Lisbon",
    'href="mailto:hello@jordanellis.dev"',
    'href="https://github.com/jordanellis"',
  ],
  dock: [
    "Jordan",
    "Tally",
    "Platform 9",
    "Ledgerly",
    "University of Manchester",
    "Kafka",
    "Tally passes 4,000 GitHub stars",
    'href="mailto:hello@jordanellis.dev"',
    'href="https://tally.dev/"',
  ],
  reel: [
    "Jordan Ellis",
    "Full-stack engineer",
    "Postgres tinkerer",
    "Tally",
    "Shiftboard",
    "pgsnap",
    "Tab",
    "Manchester",
    "measure before and after",
    'href="mailto:hello@jordanellis.dev"',
  ],
  bento: [
    "Jordan Ellis",
    "Stack &amp; tools",
    "Kafka",
    "hello@jordanellis.dev",
    "In Lisbon",
    "GitHub",
    "Shiftboard v2",
    "Tally",
    "Ledgerly",
    'href="https://github.com/jordanellis"',
  ],
  cv: [
    "Jordan Ellis",
    "Full-stack engineer",
    "Lisbon, Portugal",
    "measure before and after",
    "Ledgerly",
    "Platform 9",
    "University of Manchester",
    "Kafka",
    'href="mailto:hello@jordanellis.dev"',
    'href="https://github.com/jordanellis"',
  ],
  prose: [
    "Jordan Ellis",
    "Ledgerly",
    "Northwind Studio",
    "Tally",
    "Platform 9",
    "Open source",
    "Postgres as a queue",
    "Postgres is a fine queue",
    'href="mailto:hello@jordanellis.dev"',
    'href="https://github.com/jordanellis"',
  ],
  folio: [
    "Jordan Ellis",
    "Based in Lisbon, Portugal.",
    "Tally",
    "Shiftboard",
    "Platform 9",
    "Ledgerly",
    "Postgres is a fine queue",
    'href="mailto:hello@jordanellis.dev"',
    'href="https://tally.dev/"',
  ],
  paper: [
    "Jordan Ellis",
    "Ledgerly",
    "University of Manchester",
    "Platform 9",
    "Postgres is a fine queue",
    "Bouldering",
    "Kind of Blue",
    "Designing Data-Intensive Applications",
    "38.7223° N",
    'href="mailto:hello@jordanellis.dev"',
  ],
};

describe.each(Object.keys(SHOWS) as PortfolioTemplateId[])("the %s rebuild", (id) => {
  it("draws the full fixture: every section it has", () => {
    const html = draw(id, jordanV2Resume());
    for (const text of SHOWS[id]) expect(html, text).toContain(text);
    expect(html).not.toMatch(/<(section|article|ul)[^>]*>\s*<\/\1>/);
  });

  it("draws the least data: a long name, one project with no link, no photo, GitHub or socials", () => {
    const resume = emptyResume(1);
    resume.basics.name = "Maximilian-Alexander Featherstonehaugh-Montgomery";
    resume.projects = [
      {
        id: "p1",
        name: "A single project with no link",
        link: "",
        bullets: [{ id: "b1", text: "Only a line about it." }],
      },
    ];
    const html = draw(id, resume, OPEN, false);
    expect(html).toContain(
      id === "dock" ? "Maximilian-Alexander" : "Maximilian-Alexander Featherstonehaugh-Montgomery",
    );
    expect(html).toContain("A single project with no link");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
    expect(html).not.toMatch(/<(section|article|ul)[^>]*>\s*<\/\1>/);
  });

  it("escapes what people type", () => {
    const resume = jordanV2Resume();
    resume.basics.name = '<script>alert("x")</script>';
    resume.basics.headline = "</style><b>bold</b>";
    resume.summary = '<img src=x onerror="alert(1)">';
    resume.projects[0]!.name = "<iframe src=javascript:alert(1)>";
    const html = draw(id, resume);
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>bold</b>");
    expect(html).not.toContain("<iframe src=javascript");
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("&lt;script&gt;");
  });

  it("keeps out what the owner hid, and the email unless it's turned on", () => {
    const closed = draw(id, jordanV2Resume(), { ...OPEN, showEmail: false });
    expect(closed).not.toContain("hello@jordanellis.dev");
    const bare = draw(id, jordanV2Resume(), { ...OPEN, hiddenSections: [...PORTFOLIO_SECTIONS] });
    expect(bare).toContain("Jordan");
    for (const hidden of [
      "Platform 9",
      "Ledgerly",
      "Tripwise",
      "Kafka",
      "University of Manchester",
      "linkedin.com/in/jordan-ellis",
    ]) {
      expect(bare, hidden).not.toContain(hidden);
    }
  });
});

describe("rebuild details", () => {
  it("Navy draws jobs as tabs, with only the first panel open", () => {
    const html = draw("navy", jordanV2Resume());
    expect(html.match(/role="tab"/g)).toHaveLength(5);
    expect(html.match(/role="tabpanel"/g)).toHaveLength(5);
    expect(html.match(/role="tabpanel"[^>]*hidden=""/g)).toHaveLength(4);
    expect(html.match(/Featured Project/g)).toHaveLength(3);
    expect(html.match(/class="img code-screen"/g)).toHaveLength(3);
    expect(html).toContain(">tally.ts<");
  });

  it("Dock draws work as expandable rows and a dock with a theme toggle", () => {
    const html = draw("dock", jordanV2Resume());
    expect(html.match(/<details class="row"/g)).toHaveLength(5);
    expect(html).toContain('aria-label="Toggle theme"');
  });

  it("Dock gives every project card a drawn cover, and every milestone an icon of its kind", () => {
    const html = draw("dock", jordanV2Resume());
    expect(html.match(/class="cover" data-pattern="(dots|grid|lines)"/g)).toHaveLength(7);
    expect(html).toMatch(/class="cover-mark"[^>]*>T</);
    expect(html).toContain("Open source · analytics");
    expect(html.match(/class="t-icon"/g)).toHaveLength(6);
    expect(html).not.toContain('aria-label="Photos"');
  });

  it("Reel gives projects with more to show their own page, opened in place", () => {
    const html = draw("reel", jordanV2Resume());
    expect(html).toContain('href="#pf-reel-p-tally"');
    expect(html).toContain('id="pf-reel-p-tally"');
    expect(html).toContain('id="pf-reel-katakana-project"');
    expect(html.match(/href="#pf-reel-katakana-project"/g)).toHaveLength(4);
    expect(html).toContain('href="#pf-reel-katakana-profile"');
    expect(html).toMatch(/class="image-initials-text">JE</);
    expect(html).not.toContain('id="pf-reel-p-pgsnap"');
  });

  it("Reel puts each project in a laptop or a pair of phones, with still frames for no WebGL", () => {
    const html = draw("reel", jordanV2Resume());
    expect(html.match(/class="summary section"/g)).toHaveLength(4);
    expect(html.match(/class="summary-model" data-device="laptop"/g)).toHaveLength(2);
    expect(html.match(/class="summary-model" data-device="phone"/g)).toHaveLength(2);
    expect(html.match(/class="drawn-screen"/g)).toHaveLength(2 + 2 * 2 + 3);
    expect(html).toContain("4.2k stars");
    const laptops = drawEdited("reel", (project) => ({ ...project, device: "auto" }));
    expect(laptops.match(/class="summary-model" data-device="laptop"/g)).toHaveLength(4);
    expect(html).not.toContain("<canvas");
    expect(html).toContain("<noscript>");
    expect(html).toContain('id="pf-reel-more"');
    expect(html.match(/class="extra-row"/g)).toHaveLength(3 + 5);
  });

  it("Bento only draws the clock with a time zone, and frames every tile", () => {
    const html = draw("bento", jordanV2Resume());
    expect(html.match(/<svg class="mark"/g)).toHaveLength(4);
    expect(html).toContain('<div class="initials">JE</div>');
    expect(html).toContain("--:--");
    expect(html).toContain("-webkit-mask-box-image");
    expect(
      draw("bento", jordanV2Resume(), { ...OPEN, hiddenSections: [...PORTFOLIO_SECTIONS] }),
    ).toContain("Lisbon");
  });

  it("CV prints: contacts spelled out, links written under projects, and a command menu", () => {
    const html = draw("cv", jordanV2Resume());
    expect(html).toContain('class="print-contact"');
    expect(html).toContain('class="url"');
    expect(html).toContain("to open the command menu");
    expect(html).toContain("@page { size: A4;");
    expect(html.match(/<article/g)?.length).toBe(5 + 1 + 7);
  });

  it("Prose files projects under their kind and puts monogram chips in the intro", () => {
    const html = draw("prose", jordanV2Resume());
    for (const group of ["Open source", "SaaS", "PWA", "Hackathon"])
      expect(html).toContain(`<span>${group}</span>`);
    expect(html.match(/class="chip"/g)?.length).toBeGreaterThanOrEqual(3 + 5);
    expect(html).toMatch(/class="mono" style="--hue:\d+"/);
    expect(draw("prose", jordanV2Resume())).toBe(html);
    expect(html).toContain('class="plum"');
    expect(html).toContain("<span>2026</span>");
  });

  it("Folio gives every project tile an app icon drawn from its name", () => {
    const html = draw("folio", jordanV2Resume());
    expect(html.match(/class="tile"/g)).toHaveLength(7);
    expect(html.match(/class="app-icon"/g)).toHaveLength(7);
    expect(html).toMatch(/class="app-icon"[^>]*>T</);
    expect(html.match(/class="logo"/g)).toHaveLength(5);
  });

  it("Paper numbers its sections in order and only draws the clock with a time zone", () => {
    const html = draw("paper", jordanV2Resume());
    for (const index of ["01", "02", "03", "04", "05", "06"])
      expect(html).toContain(`<span class="tag-index" aria-hidden="true">${index}</span>`);
    expect(html).not.toContain(">07<");
    expect(html.match(/class="nav-card enter-swing"/g)).toHaveLength(3);
    expect(html).toContain('href="#pf-paper-shelf"');
    expect(html).toContain('id="pf-paper-shelf"');
    expect(html).toContain('class="halftone-ink">JE<');
    expect(html).toContain("--:--");
    expect(html).toContain('class="spine"');
    const resume = jordanV2Resume();
    resume.basics.location = "";
    const view = portfolioView(resume, OPEN);
    const content = contentView({
      view,
      content: { ...jordanContent(), location: null },
      github: null,
      now: NOW,
    });
    const { Component } = PORTFOLIO_TEMPLATES.paper;
    expect(renderToStaticMarkup(<Component view={view} content={content} />)).not.toContain(
      "--:--",
    );
  });
});

describe("every design without pictures", () => {
  const ALLOWED_URL = /^url\(\s*["']?(?:#|%23|data:|\/portfolio-templates\/)/;

  const pages = (id: PortfolioTemplateId) => {
    const bare = emptyResume(1);
    bare.basics.name = "Ada Lovelace";
    return [draw(id, jordanV2Resume()), draw(id, bare, OPEN, false)];
  };

  it.each(Object.keys(PORTFOLIO_TEMPLATES) as PortfolioTemplateId[])(
    "%s draws no picture, video or embed, and loads nothing from elsewhere",
    (id) => {
      for (const html of pages(id)) {
        expect(html).not.toMatch(/<(?:img|picture|video|iframe|object|embed|image)\b/i);
        expect(html).not.toMatch(/\ssrcset=/i);
        expect(html).not.toMatch(/\ssrc=/i);
        for (const [found] of html.matchAll(/url\([^)]*\)?/g)) {
          expect(found, id).toMatch(ALLOWED_URL);
        }
        const ownFrames = /url\(\s*["']?\/portfolio-templates\/[^)]*\)/g;
        expect(html.replace(ownFrames, "")).not.toMatch(
          /portfolio-fixtures|\/api\/portfolio\/media|\.(?:webp|png|jpe?g|avif|gif|mp4|webm)\b/i,
        );
      }
    },
  );
});
