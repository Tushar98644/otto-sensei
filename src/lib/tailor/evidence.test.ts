import { describe, expect, it } from "vitest";
import { snippetAround } from "./evidence";

function around(text: string, needle: string): string {
  const start = text.indexOf(needle);
  return snippetAround(text, start, start + needle.length);
}

describe("snippetAround", () => {
  it("returns a short line whole, without ellipses", () => {
    expect(around("Built APIs with Node.js", "Node.js")).toBe("Built APIs with Node.js");
  });

  it("cuts long lines at word boundaries on both sides", () => {
    const text =
      "Worked closely with product, design and data science to plan, build and launch the new Kubernetes based deploy pipeline for every team in the company";
    const snippet = around(text, "Kubernetes");
    expect(snippet).toMatch(/^….*Kubernetes.*…$/);
    const body = snippet.slice(1, -1);
    expect(body.length).toBeLessThanOrEqual(60);
    expect(text).toContain(body);
    expect(text.charAt(text.indexOf(body) - 1)).toBe(" ");
    expect(text.charAt(text.indexOf(body) + body.length)).toBe(" ");
  });

  it("only cuts the side that was cut", () => {
    const text = "Kubernetes " + "and more words after it ".repeat(6);
    const snippet = around(text, "Kubernetes");
    expect(snippet.startsWith("Kubernetes")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
    const tail = "words before it and more ".repeat(6) + "Kubernetes";
    const end = around(tail, "Kubernetes");
    expect(end.startsWith("…")).toBe(true);
    expect(end.endsWith("Kubernetes")).toBe(true);
  });

  it("stays on the match's line", () => {
    const text = "First line about Go\nSecond line with Kubernetes in it\nThird line";
    expect(around(text, "Kubernetes")).toBe("Second line with Kubernetes in it");
  });

  it("drops the bullet marker and extra whitespace", () => {
    expect(around("SKILLS\n-   Built  it   in Rust", "Rust")).toBe("Built it in Rust");
  });

  it("doesn't leave dangling punctuation next to an ellipsis", () => {
    const text = `${"Python, ".repeat(12)}Kubernetes, ${"Terraform, ".repeat(8)}Docker`;
    const snippet = around(text, "Kubernetes");
    expect(snippet).toMatch(/^…[^,\s]/);
    expect(snippet).toMatch(/[^,\s]…$/);
  });

  it("widens to the whole word when the match starts inside one", () => {
    const text = `${"y".repeat(70)}.NET tail`;
    expect(snippetAround(text, 70, 74)).toBe(`${"y".repeat(70)}.NET…`);
  });

  it("returns at least the match when it is longer than the window", () => {
    const long = "x".repeat(80);
    expect(around(`before ${long} after`, long)).toBe(`…${long}…`);
  });
});
