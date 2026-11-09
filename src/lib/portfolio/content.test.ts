import { describe, expect, it } from "vitest";
import {
  CONTENT_LIMITS,
  emptyContent,
  parseStoredContent,
  PortfolioContentSchema,
  PORTFOLIO_CONTENT_VERSION,
  saveableContent,
  uploadsIn,
  webHref,
} from "./content";
import { jordanContent, JORDAN_USER_ID } from "./fixtures/jordan";

const upload = (n: number) => {
  const id = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  return {
    kind: "upload" as const,
    id,
    key: `${JORDAN_USER_ID}/${id}.webp`,
    width: 800,
    height: 600,
  };
};

describe("portfolio content contract", () => {
  it("starts empty, versioned and fully automatic", () => {
    const content = emptyContent();
    expect(content.v).toBe(PORTFOLIO_CONTENT_VERSION);
    expect(content.pitch).toBeNull();
    expect(content.stats).toBeNull();
    expect(content.projects).toEqual([]);
    expect(content.photo).toBeNull();
    expect(content.github).toEqual({ username: null });
  });

  it("keeps the fixture whole: every field the designs use is in it", () => {
    const content = jordanContent();
    expect(PortfolioContentSchema.safeParse(content).success).toBe(true);
    expect(content.projects).toHaveLength(5);
    expect(uploadsIn(content).length).toBeGreaterThanOrEqual(8);
  });

  it("holds the limits", () => {
    const tooManyPhotos = Array.from({ length: CONTENT_LIMITS.photos + 1 }, (_, i) => ({
      id: `p${i}`,
      image: upload(i + 1),
    }));
    expect(PortfolioContentSchema.safeParse({ photos: tooManyPhotos }).success).toBe(false);
    const fiveShots = { id: "p1", images: [1, 2, 3, 4, 5].map(upload) };
    expect(PortfolioContentSchema.safeParse({ projects: [fiveShots] }).success).toBe(false);
    expect(
      PortfolioContentSchema.safeParse({ pitch: "x".repeat(CONTENT_LIMITS.pitch + 1) }).success,
    ).toBe(false);
    expect(PortfolioContentSchema.safeParse({ v: 2 }).success).toBe(false);
  });

  it("refuses unsafe links and pictures", () => {
    expect(
      PortfolioContentSchema.safeParse({ jobs: { e1: { website: "javascript:alert(1)" } } })
        .success,
    ).toBe(false);
    expect(
      PortfolioContentSchema.safeParse({
        photo: { kind: "link", url: "http://cdn.example.com/me.png" },
      }).success,
    ).toBe(false);
    expect(
      PortfolioContentSchema.safeParse({
        photo: { kind: "link", url: "https://lh3.googleusercontent.com/a/x=s512-c" },
      }).success,
    ).toBe(true);
    // Upload keys are only ever "<uuid>/<uuid>.webp": no paths, no other files.
    expect(
      PortfolioContentSchema.safeParse({ photo: { ...upload(1), key: "../etc/passwd" } }).success,
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
      testimonials: [{ id: "q1", quote: "Great", name: "", role: "", url: "", photo: null }],
      jobs: {
        e1: {
          highlight: null,
          summary: null,
          type: null,
          website: "not a site",
          logo: null,
          tags: null,
        },
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
