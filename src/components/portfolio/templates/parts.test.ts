import { describe, expect, it } from "vitest";
import { jordanContentView } from "@/lib/portfolio/fixtures/jordan";
import { sampleResume } from "@/lib/portfolio/testing";
import { portfolioView } from "@/lib/portfolio/view";
import { scopeCss } from "./css";
import { allSkills, contactHref, featuredFirst, safeId, seeded, seedOf } from "./parts";

describe("template parts", () => {
  it("scopes every selector, inside at-rules too, and leaves @page alone", () => {
    const css = scopeCss(
      ".pf-x",
      `:scope { color: red; }
a, b:where(c, d) { color: blue; }
@container pf (max-width: 600px) { .row { display: block; } }
@media print { .bar { display: none; } }
@page { margin: 1cm; }`,
    );
    expect(css).toContain(".pf-x { color: red; }");
    expect(css).toContain(".pf-x a, .pf-x b:where(c, d) { color: blue; }");
    expect(css).toContain("@container pf (max-width: 600px) { .pf-x .row { display: block; } }");
    expect(css).toContain("@media print { .pf-x .bar { display: none; } }");
    expect(css).toContain("@page { margin: 1cm; }");
  });

  it("keeps @keyframes steps as they are", () => {
    const css = scopeCss(
      ".pf-x",
      `.a { animation: x-fade 1s; }
@keyframes x-fade { from { opacity: 0; } 50% { opacity: 0.5; } to { opacity: 1; } }
.b { color: red; }`,
    );
    expect(css).toContain(
      "@keyframes x-fade { from { opacity: 0; } 50% { opacity: 0.5; } to { opacity: 1; } }",
    );
    expect(css).toContain(".pf-x .a { animation: x-fade 1s; }");
    expect(css).toContain(".pf-x .b { color: red; }");
  });

  it("picks where 'Say hello' goes: the email when shown, else the first link", () => {
    const content = jordanContentView();
    expect(contactHref(content)).toBe("mailto:hello@jordanellis.dev");
    expect(contactHref({ ...content, email: null })).toBe("https://github.com/jordanellis");
    expect(contactHref({ ...content, email: null, socials: [] })).toBeNull();
  });

  it("makes safe element ids, puts featured projects first and flattens skills", () => {
    expect(safeId("pf-reel-p", "gh:Octo/Repo.js")).toBe("pf-reel-p-gh-octo-repo-js");
    expect(safeId("pf-reel-p", "***")).toBe("pf-reel-p-item");
    const ordered = featuredFirst([
      { id: "a", featured: false },
      { id: "b", featured: true },
      { id: "c", featured: false },
    ]);
    expect(ordered.map((item) => item.id)).toEqual(["b", "a", "c"]);
    const view = portfolioView(sampleResume(), {
      showEmail: true,
      showPhone: true,
      hiddenSections: [],
    });
    expect(allSkills(view)).toEqual([...new Set(view.skills.flatMap((group) => group.items))]);
  });

  it("draws the same stand-in for the same name, and a different one for another", () => {
    expect(seedOf("Tally")).toBe(seedOf("Tally"));
    expect(seedOf("Tally")).not.toBe(seedOf("Quayside"));
    const a = seeded(seedOf("Tally"));
    const b = seeded(seedOf("Tally"));
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});
