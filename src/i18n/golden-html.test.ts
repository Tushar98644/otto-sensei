import { describe, expect, it } from "vitest";
import { differences, normalize, pagePath } from "../../scripts/golden-html";

describe("golden English HTML", () => {
  it("names each prerendered file by the English address it serves, before and after [lang]", () => {
    expect(pagePath("index.html")).toBe("/");
    expect(pagePath("en.html")).toBe("/");
    expect(pagePath("pricing.html")).toBe("/pricing");
    expect(pagePath("en/pricing.html")).toBe("/pricing");
    expect(pagePath("en/ats/workday.html")).toBe("/ats/workday");
    expect(pagePath("_not-found.html")).toBe("/_not-found");
    expect(pagePath("enterprise.html")).toBe("/enterprise");
    for (const file of ["es.html", "es/pricing.html", "pt-br/ats/workday.html", "de.html"]) {
      expect(pagePath(file), file).toBeNull();
    }
  });

  it("ignores scripts, build hashes and React's ids, and nothing a visitor sees", () => {
    const build = (hash: string, id: string, text: string) =>
      `<html><head><link rel="stylesheet" href="/_next/static/chunks/${hash}.css"/><link rel="preload" as="script" href="/_next/static/chunks/${hash}.js"/></head><body><div id="${id}">${text}</div><script>self.__next_f.push([1,"${hash}"])</script></body></html>`;
    expect(normalize(build("abc", "_R_2jiulb_", "Hi"))).toBe(
      normalize(build("xyz", "_R_19pf_", "Hi")),
    );
    expect(normalize(build("abc", "_R_1_", "Hi"))).not.toBe(
      normalize(build("abc", "_R_1_", "Hello")),
    );
  });

  it("lists new, gone and changed pages with the first line that differs", () => {
    expect(differences({ "/": "<a>\n<b>", "/old": "x" }, { "/": "<a>\n<c>", "/new": "y" })).toEqual(
      ["/: - <b>\n   + <c>", "/new: new", "/old: gone"],
    );
    expect(differences({ "/": "same" }, { "/": "same" })).toEqual([]);
  });
});
