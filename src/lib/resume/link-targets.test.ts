import { describe, expect, it } from "vitest";
import type { PdfLinkTarget } from "@/lib/parse/types";
import { linkTarget, withLinkTargets } from "./link-targets";
import { emptyResume } from "./schema";

// The owner's own case (2026-11-11): the page shows "github.com/Tushar" and "linkedin.com/Tushar".
const LINKS: PdfLinkTarget[] = [
  { url: "https://github.com/Tushar98644", text: "github.com/Tushar |" },
  {
    url: "https://www.linkedin.com/in/tushar-banik/",
    text: "° linkedin.com/Tushar | portfolio/tushar |",
  },
  { url: "https://github.com/Tushar98644/Vertex", text: "bit.ly/vertex-github" },
  { url: "https://github.com/someone-else/tool", text: "github.com/someone-else/tool" },
  { url: "https://jane.dev/", text: "GitHub" },
];

describe("linkTarget", () => {
  it("swaps a cut-off link for the full address drawn under it", () => {
    expect(linkTarget("github.com/Tushar", LINKS)).toBe("github.com/Tushar98644");
    expect(linkTarget("https://www.linkedin.com/Tushar", LINKS)).toBe(
      "linkedin.com/in/tushar-banik",
    );
  });

  it("keeps a short link on another site, which the person chose on purpose", () => {
    expect(linkTarget("bit.ly/vertex-github", LINKS)).toBeNull();
  });

  it("keeps a link that already is the address, or that no link sits under", () => {
    expect(linkTarget("github.com/someone-else/tool", LINKS)).toBeNull();
    expect(linkTarget("gitlab.com/tushar", LINKS)).toBeNull();
    expect(linkTarget("", LINKS)).toBeNull();
  });

  it("only fills a site's name from a link on that site", () => {
    // "GitHub" sits over jane.dev here, which isn't GitHub: no swap.
    expect(linkTarget("GitHub", LINKS)).toBeNull();
    expect(linkTarget("GitHub", [{ url: "https://github.com/jane", text: "GitHub" }])).toBe(
      "github.com/jane",
    );
  });
});

describe("withLinkTargets", () => {
  it("fixes contact links and project links, and leaves the rest alone", () => {
    const resume = emptyResume(0);
    const read = {
      ...resume,
      basics: {
        ...resume.basics,
        links: [
          { id: "a", label: "GitHub", url: "github.com/Tushar" },
          { id: "b", label: "LinkedIn", url: "linkedin.com/Tushar" },
          { id: "c", label: "Portfolio", url: "bit.ly/portfolio-tushar" },
        ],
      },
      projects: [{ id: "p", name: "Vertex", link: "bit.ly/vertex-github", bullets: [] }],
    };
    const fixed = withLinkTargets(read, LINKS);
    expect(fixed.basics.links.map((link) => link.url)).toEqual([
      "github.com/Tushar98644",
      "linkedin.com/in/tushar-banik",
      "bit.ly/portfolio-tushar",
    ]);
    expect(fixed.projects[0]!.link).toBe("bit.ly/vertex-github");
    expect(withLinkTargets(read, [])).toBe(read);
  });
});
