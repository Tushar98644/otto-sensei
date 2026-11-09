import { describe, expect, it } from "vitest";
import {
  cleanProjectImages,
  PROJECT_IMAGE_LIMITS,
  PROJECT_IMAGE_MESSAGES,
  projectImageProblem,
  ProjectImagesSchema,
  safeImageUrl,
} from "./images";
import { UpdatePortfolioSchema } from "./types";

describe("project picture addresses", () => {
  it("takes full https addresses and nothing else", () => {
    expect(projectImageProblem("")).toBeNull();
    expect(projectImageProblem("  https://cdn.example.com/shot.png  ")).toBeNull();
    expect(projectImageProblem("http://cdn.example.com/shot.png")).toBe(
      PROJECT_IMAGE_MESSAGES.notHttps,
    );
    expect(projectImageProblem("javascript:alert(1)")).toBe(PROJECT_IMAGE_MESSAGES.notHttps);
    expect(projectImageProblem("data:image/png;base64,AAAA")).toBe(PROJECT_IMAGE_MESSAGES.notHttps);
    expect(projectImageProblem("cdn.example.com/shot.png")).toBe(PROJECT_IMAGE_MESSAGES.notAddress);
    expect(projectImageProblem("https://user:pass@cdn.example.com/a.png")).toBe(
      PROJECT_IMAGE_MESSAGES.credentials,
    );
    expect(projectImageProblem(`https://e.com/${"a".repeat(PROJECT_IMAGE_LIMITS.urlLength)}`)).toBe(
      PROJECT_IMAGE_MESSAGES.tooLong,
    );
  });

  it("hands an <img> only a normalized safe address", () => {
    expect(safeImageUrl(" https://CDN.example.com/a b.png ")).toBe(
      "https://cdn.example.com/a%20b.png",
    );
    expect(safeImageUrl("http://cdn.example.com/a.png")).toBeNull();
    expect(safeImageUrl("")).toBeNull();
    expect(safeImageUrl(undefined)).toBeNull();
  });

  it("validates the map the editor sends", () => {
    expect(ProjectImagesSchema.parse({ p1: " https://cdn.example.com/a.png " })).toEqual({
      p1: "https://cdn.example.com/a.png",
    });
    expect(ProjectImagesSchema.safeParse({ p1: "http://cdn.example.com/a.png" }).success).toBe(
      false,
    );
    expect(ProjectImagesSchema.safeParse({ p1: "javascript:alert(1)" }).success).toBe(false);
    expect(ProjectImagesSchema.safeParse({ "": "https://cdn.example.com/a.png" }).success).toBe(
      false,
    );
    const tooMany = Object.fromEntries(
      Array.from({ length: PROJECT_IMAGE_LIMITS.perPortfolio + 1 }, (_, i) => [
        `p${i}`,
        "https://e.com/a.png",
      ]),
    );
    expect(ProjectImagesSchema.safeParse(tooMany).success).toBe(false);
    expect(UpdatePortfolioSchema.safeParse({ projectImages: {} }).success).toBe(true);
    expect(
      UpdatePortfolioSchema.safeParse({ projectImages: { p1: "ftp://e.com/a.png" } }).success,
    ).toBe(false);
  });

  it("drops anything unsafe from a stored row", () => {
    expect(
      cleanProjectImages({
        p1: "https://e.com/a.png",
        p2: "http://e.com/b.png",
        p3: 4,
        "": "https://e.com/c.png",
      }),
    ).toEqual({ p1: "https://e.com/a.png" });
    expect(cleanProjectImages(null)).toEqual({});
    expect(cleanProjectImages(["https://e.com/a.png"])).toEqual({});
  });
});
