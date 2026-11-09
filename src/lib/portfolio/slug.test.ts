import { describe, expect, it } from "vitest";
import {
  isPortfolioSlug,
  normalizeSlug,
  numberedSlug,
  SLUG_MAX,
  slugProblem,
  suggestSlug,
} from "./slug";

describe("portfolio slugs", () => {
  it("turns what people type into an address", () => {
    expect(normalizeSlug("  Maya Chen ")).toBe("maya-chen");
    expect(normalizeSlug("José Ñúñez")).toBe("jose-nunez");
    expect(normalizeSlug("--dev__42!!")).toBe("dev-42");
    expect(normalizeSlug("A.B. Smith")).toBe("a-b-smith");
  });

  it("accepts lowercase words joined by single hyphens, 3 to 40 long", () => {
    expect(slugProblem("maya-chen")).toBeNull();
    expect(slugProblem("dev42")).toBeNull();
    expect(slugProblem("ab")).toBe("too_short");
    expect(slugProblem("a".repeat(SLUG_MAX + 1))).toBe("too_long");
    expect(slugProblem("Maya-Chen")).toBe("characters");
    expect(slugProblem("maya--chen")).toBe("characters");
    expect(slugProblem("-maya")).toBe("characters");
    expect(slugProblem("maya_chen")).toBe("characters");
  });

  it("blocks reserved words and anything starting with the product's name", () => {
    for (const word of ["admin", "api", "dashboard", "login", "support", "pricing", "otto"]) {
      expect(slugProblem(word)).toBe("reserved");
    }
    expect(slugProblem("ottosensei")).toBe("reserved");
    expect(slugProblem("otto-sensei-team")).toBe("reserved");
    expect(slugProblem("otto-smith")).toBeNull();
  });

  it("suggests an address from the name that always passes the rules", () => {
    expect(suggestSlug("Maya Chen")).toBe("maya-chen");
    expect(suggestSlug("")).toBe("my-portfolio");
    expect(suggestSlug("Jo")).toBe("jo-portfolio");
    expect(suggestSlug("Admin")).toBe("admin-portfolio");
    expect(suggestSlug("Otto Sensei")).toBe("my-portfolio");
    const long = suggestSlug("Alexandria Konstantinopoulou-Vanderbilt Featherstonehaugh");
    expect(long.length).toBeLessThanOrEqual(SLUG_MAX);
    expect(long.endsWith("-")).toBe(false);
    for (const name of ["李小龍", "!!!", "x", "Max", "a".repeat(60)]) {
      expect(isPortfolioSlug(suggestSlug(name))).toBe(true);
    }
  });

  it("numbers a taken suggestion without going past the limit", () => {
    expect(numberedSlug("maya-chen", 2)).toBe("maya-chen-2");
    const long = numberedSlug("a".repeat(SLUG_MAX), 12);
    expect(long.length).toBeLessThanOrEqual(SLUG_MAX);
    expect(isPortfolioSlug(long)).toBe(true);
    expect(isPortfolioSlug(numberedSlug("maya-chen", "a1b2"))).toBe(true);
  });
});
