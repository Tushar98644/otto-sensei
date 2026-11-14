import { describe, expect, it } from "vitest";
import {
  CONTENT_LIMITS,
  emptyContent,
  emptyJobExtra,
  emptySchoolExtra,
  newProjectEntry,
  PORTFOLIO_CONTENT_VERSION,
  saveableContent,
  webHref,
} from "./content";
import {
  JobExtraSchema,
  parseStoredContent,
  PortfolioContentSchema,
  ProjectEntrySchema,
  SchoolExtraSchema,
} from "./content-validation";
import { jordanContent } from "./fixtures/jordan";

const oldUpload = {
  kind: "upload" as const,
  id: "00000000-0000-4000-8000-000000000001",
  key: "00000000-0000-4000-8000-0000000000e1/00000000-0000-4000-8000-000000000001.webp",
  width: 800,
  height: 600,
};

describe("portfolio content contract", () => {
  it("starts empty, versioned and fully automatic", () => {
    const content = emptyContent();
    expect(content.v).toBe(PORTFOLIO_CONTENT_VERSION);
    expect(content.pitch).toBeNull();
    expect(content.stats).toBeNull();
    expect(content.projects).toEqual([]);
    expect(content.github).toEqual({ username: null });
  });

  it("keeps the fixture whole: every field the designs use is in it", () => {
    const content = jordanContent();
    expect(PortfolioContentSchema.parse(content)).toStrictEqual(content);
    expect(content.projects).toHaveLength(7);
  });

  it("holds no pictures: anything an older document stored is dropped when it's read", () => {
    const stored = parseStoredContent({
      pitch: "Hi",
      photo: oldUpload,
      photos: [{ id: "ph1", image: oldUpload, caption: "Sintra" }],
      projects: [
        {
          id: "p1",
          images: [oldUpload],
          video: "https://youtu.be/dQw4w9WgXcQ",
          logo: oldUpload,
          device: "browser",
        },
        { id: "p2", device: "none" },
      ],
      jobs: { e1: { website: "https://ledgerly.example", logo: oldUpload } },
      schools: { ed1: { logo: { kind: "link", url: "https://cdn.example.com/u.png" } } },
      milestones: [{ id: "m1", title: "Winner", logo: oldUpload }],
      testimonials: [{ id: "q1", quote: "Great", name: "Maya", photo: oldUpload }],
      hidden: ["photo", "photos", "talks"],
    });
    expect(stored.pitch).toBe("Hi");
    const json = JSON.stringify(stored);
    for (const word of ["photo", "images", "video", "logo", ".webp", "cdn.example.com"]) {
      expect(json).not.toContain(word);
    }
    expect(stored.projects.map((project) => project.device)).toEqual(["auto", "auto"]);
    expect(stored.jobs.e1?.website).toBe("https://ledgerly.example");
    expect(stored.milestones?.[0]?.title).toBe("Winner");
    expect(stored.hidden).toEqual(["talks"]);
  });

  it("holds the limits", () => {
    expect(
      PortfolioContentSchema.safeParse({ pitch: "x".repeat(CONTENT_LIMITS.pitch + 1) }).success,
    ).toBe(false);
    expect(PortfolioContentSchema.safeParse({ v: 2 }).success).toBe(false);
  });

  it("refuses unsafe links", () => {
    expect(
      PortfolioContentSchema.safeParse({ jobs: { e1: { website: "javascript:alert(1)" } } })
        .success,
    ).toBe(false);
    expect(webHref("example.com")).toBe("https://example.com/");
    expect(webHref("ftp://example.com")).toBeNull();
    expect(webHref("https://user:pw@example.com")).toBeNull();
  });

  it("reads a damaged row as empty instead of failing the page", () => {
    expect(parseStoredContent({ pitch: 42 })).toEqual(emptyContent());
    expect(parseStoredContent(null)).toEqual(emptyContent());
    expect(parseStoredContent({ pitch: "Hi" }).pitch).toBe("Hi");
  });

  it("saves the finished part and keeps half-typed rows out of the request", () => {
    const content = {
      ...emptyContent(),
      socials: [
        { id: "s1", label: "GitHub", url: "https://github.com/x" },
        { id: "s2", label: "", url: "" },
      ],
      talks: [
        { id: "t1", title: "", event: "", date: "", place: "", url: "", recording: "", slides: "" },
      ],
      testimonials: [{ id: "q1", quote: "Great", name: "", role: "", url: "" }],
      jobs: {
        e1: { highlight: null, summary: null, type: null, website: "not a site", tags: null },
      },
    };
    const saved = saveableContent(content);
    expect(saved.socials).toHaveLength(1);
    expect(saved.talks).toEqual([]);
    expect(saved.testimonials).toEqual([]);
    expect(saved.jobs.e1?.website).toBe("");
    expect(PortfolioContentSchema.safeParse(saved).success).toBe(true);
  });
});

describe("plain defaults, built without zod for the editor", () => {
  it("match what the schema fills in", () => {
    expect(emptyContent()).toStrictEqual(PortfolioContentSchema.parse({}));
    expect(newProjectEntry("gh:jordanellis/tally")).toStrictEqual(
      ProjectEntrySchema.parse({ id: "gh:jordanellis/tally" }),
    );
    expect(newProjectEntry("c:1", "New project")).toStrictEqual(
      ProjectEntrySchema.parse({ id: "c:1", name: "New project" }),
    );
    expect(emptyJobExtra()).toStrictEqual(JobExtraSchema.parse({}));
    expect(emptySchoolExtra()).toStrictEqual(SchoolExtraSchema.parse({}));
  });

  it("hand out fresh objects every time", () => {
    const first = emptyContent();
    first.projects.push(newProjectEntry("c:1"));
    first.github.username = "jordanellis";
    first.hidden.push("talks");
    expect(emptyContent()).toStrictEqual(PortfolioContentSchema.parse({}));
    expect(newProjectEntry("c:2").details).not.toBe(newProjectEntry("c:2").details);
  });

  it("refuses a project id the save would refuse", () => {
    const longest = `gh:${"a".repeat(CONTENT_LIMITS.entryId - 3)}`;
    expect(newProjectEntry(longest).id).toBe(longest);
    expect(ProjectEntrySchema.safeParse({ id: longest }).success).toBe(true);
    expect(() => newProjectEntry(`${longest}a`)).toThrow(RangeError);
    expect(ProjectEntrySchema.safeParse({ id: `${longest}a` }).success).toBe(false);
    expect(() => newProjectEntry("")).toThrow(RangeError);
  });
});
