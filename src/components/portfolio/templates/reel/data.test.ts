import { describe, expect, it } from "vitest";
import type { ContentProject } from "@/lib/portfolio/content";
import {
  coverRect,
  deviceOf,
  indexText,
  introLabel,
  projectTarget,
  titleScale,
  wrapText,
} from "./data";

function project(overrides: Partial<ContentProject> = {}): ContentProject {
  return {
    id: "p1",
    from: "custom",
    name: "Tally",
    line: "",
    description: "",
    details: [],
    lines: [],
    category: "",
    years: "",
    outcome: "",
    tech: [],
    roles: [],
    website: null,
    source: null,
    featured: false,
    active: false,
    stars: null,
    device: "auto",
    monogram: "TA",
    ...overrides,
  } as ContentProject;
}

describe("deviceOf", () => {
  it("draws a pair of phones when the owner picks them, else a laptop", () => {
    expect(deviceOf(project({ device: "phone" }))).toBe("phone");
    expect(deviceOf(project({ device: "laptop" }))).toBe("laptop");
    expect(deviceOf(project())).toBe("laptop");
  });
});

describe("projectTarget", () => {
  it("opens the project's own page when there's more to show, else its site or source", () => {
    expect(projectTarget(project({ id: "gh:o/r", details: ["More."] }))).toEqual({
      href: "#pf-reel-p-gh-o-r",
      label: "View project",
    });
    const website = { href: "https://tally.dev/", text: "tally.dev" };
    expect(projectTarget(project({ website }))).toEqual({
      href: website.href,
      label: "View website",
    });
    const source = { href: "https://github.com/o/r", text: "github.com/o/r", repo: "o/r" };
    expect(projectTarget(project({ source }))).toEqual({ href: source.href, label: "View source" });
    expect(projectTarget(project())).toBeNull();
  });
});

describe("intro words", () => {
  it("numbers like the original and labels the title for screen readers", () => {
    expect(indexText(1)).toBe("01");
    expect(indexText(12)).toBe("12");
    expect(introLabel("Designer", ["Developer", "Prototyper", "Animator"])).toBe(
      "Designer + Developer, Prototyper, and Animator",
    );
    expect(introLabel("Designer", ["Developer"])).toBe("Designer + Developer");
    expect(introLabel("Designer", [])).toBe("Designer");
  });

  it("keeps the original's word lengths at full size and steps longer ones down", () => {
    expect(titleScale("Designer", ["Developer", "Illustrator"])).toBe(1);
    expect(titleScale("Full-stack engineer", ["Product builder"])).toBeCloseTo(13 / 19, 3);
    expect(titleScale("", [])).toBe(1);
  });
});

describe("coverRect", () => {
  it("crops a wide drawing across the middle and a tall one from the top", () => {
    expect(coverRect(2000, 1000, 1280, 800)).toEqual({ x: 200, y: 0, width: 1600, height: 1000 });
    expect(coverRect(1000, 3000, 400, 800)).toEqual({ x: 0, y: 0, width: 1000, height: 2000 });
    expect(coverRect(1280, 800, 1280, 800)).toEqual({ x: 0, y: 0, width: 1280, height: 800 });
    expect(coverRect(0, 0, 1280, 800)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

describe("wrapText", () => {
  it("breaks on words, cuts long words, and ends a cut with an ellipsis", () => {
    expect(wrapText("Snapshot and branch Postgres databases", 16, 3)).toEqual([
      "Snapshot and",
      "branch Postgres",
      "databases",
    ]);
    expect(wrapText("one two three four five six", 9, 2)).toEqual(["one two", "three…"]);
    expect(wrapText("Supercalifragilistic", 8, 2)).toEqual(["Superca…"]);
    expect(wrapText("   ", 10, 2)).toEqual([]);
  });
});
