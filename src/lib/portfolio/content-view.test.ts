import { describe, expect, it } from "vitest";
import { CONTENT_SECTIONS, emptyContent, type PortfolioContent } from "./content";
import { contentChecklist, contentUsesFor, hiddenFields, REFERENCE_USES } from "./content-uses";
import { PortfolioContentSchema, ProjectEntrySchema } from "./content-validation";
import {
  autoContent,
  contentView,
  markParts,
  mentions,
  portfolioViews,
  sentences,
} from "./content-view";
import { jordanContent, jordanContentView, jordanGitHub, jordanV2Resume } from "./fixtures/jordan";
import { findPlace } from "./places";
import { PORTFOLIO_SECTIONS } from "./types";
import { portfolioView } from "./view";

const NOW = Date.UTC(2026, 10, 8);
const view = (showEmail = false) =>
  portfolioView(jordanV2Resume(), { showEmail, showPhone: false, hiddenSections: [] });

describe("automatic content from the resume and GitHub", () => {
  const auto = autoContent(view(true), jordanGitHub(), NOW);

  it("fills the pitch, intro and availability from the summary", () => {
    expect(auto.pitch).toBe(
      "I build fast, calm software for teams that move money and data, from the Postgres schema to the last pixel.",
    );
    expect(auto.intro).toMatch(/^Seven years shipping product end to end\./);
    expect(auto.availability).toEqual({
      open: true,
      text: "Open to senior full-stack roles from January 2027.",
      short: "Available Jan 2027",
    });
  });

  it("places the city for a clock and a map", () => {
    expect(auto.location).toMatchObject({ city: "Lisbon", timezone: "Europe/Lisbon" });
    expect(findPlace("San Francisco, CA")?.timezone).toBe("America/Los_Angeles");
    expect(findPlace("Remote")).toBeNull();
    expect(findPlace("Lagos, Nigeria")?.city).toBe("Lagos");
    expect(findPlace("villa la angostura")).toBeNull();
  });

  it("turns resume links into socials, with email only when the owner shows it", () => {
    expect(auto.socials.map((social) => social.kind)).toEqual([
      "github",
      "linkedin",
      "x",
      "website",
      "email",
    ]);
    expect(
      autoContent(view(false), null, NOW).socials.some((social) => social.kind === "email"),
    ).toBe(false);
  });

  it("pulls each job's strongest number into its highlight", () => {
    expect(auto.jobs.e1?.highlight).toBe("-72% failed payouts");
    expect(auto.jobs.e2?.highlight).toBe("+11% booking conversion");
    expect(auto.jobs.e2?.tags).toEqual(["React", "GraphQL"]);
  });

  it("maps GitHub repos onto projects: stars, language, source link, activity", () => {
    const tally = auto.projects.find((project) => project.id === "tally")!;
    expect(tally.outcome).toBe("4.2k stars · 600+ sites · 38 contributors");
    expect(tally.source).toEqual({
      href: "https://github.com/jordanellis/tally",
      text: "github.com/jordanellis/tally",
      repo: "jordanellis/tally",
    });
    expect(tally.website?.href).toBe("https://tally.dev/");
    expect(tally.category).toBe("Open source");
    expect(tally.active).toBe(true);
    expect(tally.tech).toContain("TypeScript");
    const tab = auto.projects.find((project) => project.id === "tab")!;
    expect(tab.category).toBe("Hackathon · Open source");
    const shiftboard = auto.projects.find((project) => project.id === "shiftboard")!;
    expect(shiftboard.website?.href).toBe("https://shiftboard.app/");
    expect(shiftboard.source).toBeNull();
    expect(shiftboard.category).toBe("SaaS");
  });

  it("counts years per skill from the jobs that mention it, and headline stats", () => {
    expect(auto.skillYears.react).toBe(3);
    expect(auto.skillYears.kafka).toBeNull();
    expect(auto.stats[0]).toEqual({ id: "st-years", value: "10", label: "years of experience" });
    expect(auto.stats[1]).toEqual({ id: "st-stars", value: "9.4k", label: "GitHub stars" });
    expect(auto.stats.map((stat) => stat.value)).toContain("1.4M");
    expect(auto.now[0]).toMatchObject({
      label: "Building",
      text: expect.stringMatching(/^tally: /),
    });
    expect(auto.githubUsername).toBe("jordanellis");
  });

  it("reads awards, talks, writing and interests from the resume's extra sections", () => {
    const resume = jordanV2Resume();
    resume.extras = [
      {
        id: "x1",
        kind: "awards",
        title: "Awards",
        items: [
          {
            id: "a1",
            title: "Best Fintech Hack, Lisbon Hack Week",
            subtitle: "Lisbon",
            date: "2024",
            detail: "Winner of 120 teams",
            bullets: [],
          },
        ],
      },
      {
        id: "x2",
        kind: "publications",
        title: "Writing",
        items: [
          {
            id: "w1",
            title: "Postgres is a fine queue",
            subtitle: "Own blog",
            date: "2026",
            detail: "https://jordanellis.dev/q",
            bullets: [],
          },
        ],
      },
      {
        id: "x3",
        kind: "custom",
        title: "Interests",
        items: [
          {
            id: "i1",
            title: "Bouldering, film photography, road cycling",
            subtitle: "",
            date: "",
            detail: "",
            bullets: [],
          },
        ],
      },
    ];
    const fromExtras = autoContent(
      portfolioView(resume, { showEmail: false, showPhone: false, hiddenSections: [] }),
      null,
      NOW,
    );
    expect(fromExtras.milestones[0]).toMatchObject({
      kind: "hackathon",
      date: "2024",
      result: "Winner",
    });
    expect(fromExtras.writing[0]).toMatchObject({
      title: "Postgres is a fine queue",
      url: "https://jordanellis.dev/q",
      publisher: "Own blog",
    });
    expect(fromExtras.interests.map((item) => item.title)).toEqual([
      "Bouldering",
      "film photography",
      "road cycling",
    ]);
  });

  it("reads project lines as written: dotted names stay whole, a stack line becomes tags", () => {
    const resume = jordanV2Resume();
    resume.projects = [
      {
        id: "p1",
        name: "Calby",
        link: "",
        bullets: [
          { id: "b1", text: "AI voice agent with warm transfer" },
          { id: "b2", text: "Next.js · FastAPI · LiveKit" },
          { id: "b3", text: "Built the call flow with Next.js, using LiveKit for audio" },
        ],
      },
    ];
    resume.skills = [{ id: "s1", label: "", items: ["Next.js", "FastAPI", "LiveKit"] }];
    const [project] = autoContent(
      portfolioView(resume, { showEmail: false, showPhone: false, hiddenSections: [] }),
      null,
      NOW,
    ).projects;
    expect(project?.line).toBe("AI voice agent with warm transfer");
    expect(project?.description).toBe(
      "AI voice agent with warm transfer. Built the call flow with Next.js, using LiveKit for audio.",
    );
    expect(project?.tech).toEqual(["Next.js", "FastAPI", "LiveKit"]);
    expect(sentences("Mail me at jane@mail.com. Shipped v2.0 in Next.js! Done")).toEqual([
      "Mail me at jane@mail.com.",
      "Shipped v2.0 in Next.js!",
      "Done",
    ]);
  });
});

describe("the content view templates draw", () => {
  it("resolves the Jordan fixture with every section filled", () => {
    const rich = jordanContentView();
    expect(rich.projects).toHaveLength(7);
    expect(rich.projects[0]).toMatchObject({
      name: "Tally",
      featured: true,
      outcome: "4.2k stars · 600+ sites · 38 contributors",
    });
    expect(rich.projects[0]).toMatchObject({ monogram: "T", device: "laptop" });
    expect(rich.projects[3]).toMatchObject({ name: "Platform 9", monogram: "P", device: "phone" });
    expect(rich.experience[0]).toMatchObject({
      highlight: "-72% failed payouts",
      current: true,
      type: "Fintech · invoicing and payouts",
    });
    expect(rich.experience[0]?.monogram).toBe("L");
    expect(rich.experience[2]?.monogram).toBe("NS");
    expect(rich.education[0]?.monogram).toBe("UM");
    expect(rich.location).toEqual({
      label: "Lisbon, Portugal",
      city: "Lisbon",
      timezone: "Europe/Lisbon",
      coords: { lat: 38.7223, lng: -9.1393 },
    });
    expect(rich.testimonials[0]?.initials).toBe("MO");
    expect(rich.writing[0]?.publisher).toBe("jordanellis.dev");
    expect(rich.github?.href).toBe("https://github.com/jordanellis");
    expect(rich.aboutParts[0]?.filter((part) => part.mark).map((part) => part.text)).toEqual([
      "Manchester",
      "Berlin",
      "Lisbon",
    ]);
    expect(rich.initials).toBe("JE");
  });

  it("hides switched-off sections", () => {
    const content: PortfolioContent = { ...jordanContent(), hidden: ["github", "shelf", "stats"] };
    const rich = contentView({ view: view(), content, github: jordanGitHub(), now: NOW });
    expect(rich.github).toBeNull();
    expect(rich.shelf).toEqual([]);
    expect(rich.stats).toEqual([]);
  });

  it("draws no pictures: no photo from GitHub, no logos, no screenshots", () => {
    const rich = contentView({
      view: view(),
      content: emptyContent(),
      github: jordanGitHub(),
      now: NOW,
    });
    expect(rich).not.toHaveProperty("photo");
    expect(rich).not.toHaveProperty("photos");
    expect(JSON.stringify(rich)).not.toContain("avatars.githubusercontent.com");
    for (const project of rich.projects) {
      expect(Object.keys(project)).not.toEqual(expect.arrayContaining(["images"]));
      expect(project.monogram).not.toBe("");
    }
  });

  it("follows the resume: new projects join at the end, deleted ones take their extras with them", () => {
    const content = PortfolioContentSchema.parse({
      projects: [
        { id: "pgsnap", outcome: "Mine" },
        { id: "gone", name: "Removed from the resume" },
        { id: "gh:jordanellis/platform9" },
        { id: "c:1", name: "Side thing" },
        { id: "tally", hidden: true },
      ],
    });
    const rich = contentView({ view: view(), content, github: jordanGitHub(), now: NOW });
    expect(rich.projects.map((project) => project.id)).toEqual([
      "pgsnap",
      "gh:jordanellis/platform9",
      "c:1",
      "shiftboard",
      "platform9",
      "tab",
      "quayside",
      "inkwell",
    ]);
    expect(rich.projects[0]?.outcome).toBe("Mine");
    expect(rich.projects[1]).toMatchObject({ from: "github", name: "platform9", stars: 210 });
  });

  it("never puts the email on the page unless the owner shows it", () => {
    const content = PortfolioContentSchema.parse({
      socials: [{ id: "s1", url: "mailto:hello@jordanellis.dev" }],
    });
    expect(contentView({ view: view(false), content, github: null }).socials).toEqual([]);
    expect(contentView({ view: view(true), content, github: null }).socials[0]?.kind).toBe("email");
  });

  it("marks highlighted phrases, longest first, and finds whole words", () => {
    expect(markParts("Ledgerly Pay at Ledgerly", ["Ledgerly", "Ledgerly Pay"])).toEqual([
      { text: "Ledgerly Pay", mark: true },
      { text: " at ", mark: false },
      { text: "Ledgerly", mark: true },
    ]);
    expect(mentions("Built in Node.js and C++", "Node.js")).toBe(true);
    expect(mentions("Built in Node.js and C++", "C++")).toBe(true);
    expect(mentions("Reacted quickly", "React")).toBe(false);
  });

  it("lists what a design uses and what's missing", () => {
    expect(contentUsesFor("navy")).toContain("pitch");
    expect(contentUsesFor("some-new-design").length).toBeGreaterThan(15);
    const rich = contentView({ view: view(), content: emptyContent(), github: null });
    const items = contentChecklist(rich, REFERENCE_USES.cali);
    expect(items.find((item) => item.field === "shelf")?.done).toBe(false);
    expect(items.find((item) => item.field === "about")?.done).toBe(true);
    expect(items.find((item) => item.field === "location")?.done).toBe(true);
    expect(
      contentChecklist(jordanContentView(), REFERENCE_USES.cali).every((item) => item.done),
    ).toBe(true);
  });
});

describe("hidden sections", () => {
  const written: PortfolioContent = {
    ...jordanContent(),
    socials: [{ id: "s1", label: "Blog", url: "https://blog.example.com" }],
    projects: [
      ...jordanContent().projects,
      ProjectEntrySchema.parse({
        id: "c:00000000-0000-4000-8000-000000000abc",
        name: "Side quest",
      }),
    ],
    hidden: [...CONTENT_SECTIONS],
  };
  const { page, editor } = portfolioViews({
    resume: jordanV2Resume(),
    settings: { showEmail: false, showPhone: false, hiddenSections: [...PORTFOLIO_SECTIONS] },
    content: written,
    github: jordanGitHub(),
    now: NOW,
  });

  it("keep everything off the page, including what was written for them in the editor", () => {
    expect(page.view.hidden).toEqual([...PORTFOLIO_SECTIONS]);
    expect(page.content.about).toEqual([]);
    expect(page.content.projects).toEqual([]);
    expect(page.content.experience).toEqual([]);
    expect(page.content.socials).toEqual([]);
    expect(page.content.location).toBeNull();
    expect(page.content.writing).toEqual([]);
    expect(page.content.shelf).toEqual([]);
    expect(page.content.email).toBeNull();
  });

  it("keep everything in the editor, so it can still be edited and shown again", () => {
    expect(editor.content.about).toEqual(written.about);
    expect(editor.auto.about.length).toBeGreaterThan(0);
    expect(editor.content.projects.map((project) => project.name)).toEqual([
      "Tally",
      "Shiftboard",
      "Quayside",
      "Platform 9",
      "pgsnap",
      "Inkwell",
      "Tab",
      "Side quest",
    ]);
    expect(editor.auto.projects).toHaveLength(7);
    expect(editor.content.experience.map((job) => job.company)).toEqual([
      "Ledgerly",
      "Tripwise",
      "Northwind Studio",
      "Brightline",
      "Paperplane Coffee",
    ]);
    expect(editor.content.education).toHaveLength(1);
    expect(editor.content.skills.length).toBeGreaterThan(0);
    expect(editor.content.socials.map((social) => social.label)).toEqual(["Blog"]);
    expect(editor.auto.socials.map((social) => social.kind)).toEqual(
      expect.arrayContaining(["github", "linkedin", "email"]),
    );
    expect(editor.content.location?.city).toBe("Lisbon");
    expect(editor.content.writing).toHaveLength(6);
    expect(editor.content.shelf).toHaveLength(8);
  });

  it("mark what's hidden in the checklist instead of asking for it", () => {
    const hidden = hiddenFields(page.view.hidden, written.hidden);
    const items = contentChecklist(editor.content, REFERENCE_USES.cali, hidden);
    expect(items.every((item) => item.hidden)).toBe(true);
    expect(items.find((item) => item.field === "shelf")).toMatchObject({
      done: true,
      note: "Hidden on your page",
    });
    expect(hiddenFields([], []).size).toBe(0);
    expect([...hiddenFields(["projects"], [])]).toEqual(["projectDetails", "categories"]);
  });
});
