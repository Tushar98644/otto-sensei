import { describe, expect, it } from "vitest";
import {
  capPerCompany,
  closeness,
  compareRanked,
  freshness,
  levelFactor,
  levelGap,
  placeFactor,
} from "./order";
import type { JobMatch, MatchLabel } from "./types";

const DAY = 24 * 60 * 60 * 1_000;
const matchOf = (label: MatchLabel): JobMatch => ({
  label,
  found: [],
  missing: [],
  reason: "",
  notes: [],
  blocked: false,
});
const NOW = Date.UTC(2026, 10, 9, 12);

describe("closeness", () => {
  const weights = new Map([
    ["JavaScript", 0.7],
    ["Elixir", 5.2],
    ["SQL", 0.9],
  ]);
  const weight = (skill: string) => weights.get(skill) ?? 1;

  it("counts a rare shared skill for more than a common one", () => {
    const rare = closeness({ found: ["Elixir"] }, ["Elixir", "SQL"], weight, 1);
    const common = closeness({ found: ["JavaScript"] }, ["JavaScript", "SQL"], weight, 1);
    expect(rare).toBeGreaterThan(common);
  });

  it("prefers a post the resume covers to one that asks for much more", () => {
    const covered = closeness({ found: ["Elixir", "SQL"] }, ["Elixir", "SQL"], weight, 0);
    const partial = closeness(
      { found: ["Elixir", "SQL"] },
      ["Elixir", "SQL", "Go", "Rust", "Kafka"],
      weight,
      0,
    );
    expect(covered).toBeGreaterThan(partial);
  });

  it("adds a little for the same kind of role, half for one only an older title names", () => {
    const same = closeness({ found: [] }, ["SQL"], weight, 1);
    const past = closeness({ found: [] }, ["SQL"], weight, 0.5);
    expect(same).toBeGreaterThan(past);
    expect(past).toBeGreaterThan(closeness({ found: [] }, ["SQL"], weight, 0));
  });
});

describe("level and place in the order", () => {
  it("keeps the same level first, one step away a little lower, two steps far lower", () => {
    expect(levelGap("senior", "senior")).toBe(0);
    expect(levelGap("mid", "senior")).toBe(1);
    expect(levelGap(null, "director")).toBe(0);
    expect(levelFactor(0)).toBe(1);
    expect(levelFactor(1)).toBeLessThan(1);
    expect(levelFactor(-1)).toBeLessThan(1);
    expect(levelFactor(1)).toBeLessThan(levelFactor(-1));
    expect(levelFactor(2)).toBeLessThan(levelFactor(1));
    expect(levelFactor(-3)).toBe(levelFactor(2));
  });

  it("raises a place the card names and lowers one it rules out", () => {
    expect(placeFactor("match")).toBeGreaterThan(placeFactor("unknown"));
    expect(placeFactor("miss")).toBeLessThan(placeFactor("unknown"));
  });

  it("orders a ruled-out place a label lower than it shows", () => {
    const strong = matchOf("strong");
    const good = matchOf("good");
    const list = [
      { match: strong, company: "A", postedAt: 1, closeness: 9, demoted: true },
      { match: good, company: "B", postedAt: 1, closeness: 5 },
      { match: strong, company: "C", postedAt: 1, closeness: 1 },
    ];
    expect(list.sort(compareRanked).map((item) => item.company)).toEqual(["C", "A", "B"]);
  });

  it("puts the role looked for before an older title's kind with the same label", () => {
    const good = matchOf("good");
    const list = [
      { match: good, company: "Ops", postedAt: 1, closeness: 9, pastKind: true },
      { match: good, company: "Product", postedAt: 1, closeness: 2 },
    ];
    expect(list.sort(compareRanked).map((item) => item.company)).toEqual(["Product", "Ops"]);
  });
});

describe("freshness", () => {
  it("is a small nudge that shrinks with age", () => {
    expect(freshness(NOW - 2 * DAY, NOW)).toBe(1);
    expect(freshness(NOW - 20 * DAY, NOW)).toBe(0.9);
    expect(freshness(NOW - 90 * DAY, NOW)).toBe(0.75);
  });
});

describe("capPerCompany", () => {
  const jobs = (companies: string) =>
    companies.split("").map((company, index) => ({ company, index }));
  const order = (items: { company: string }[]) => items.map((item) => item.company).join("");

  it("never shows one company twice in a row while another is left", () => {
    expect(order(capPerCompany(jobs("AAB")))).toBe("ABA");
    expect(order(capPerCompany(jobs("AAAABB")))).toBe("ABABAA");
  });

  it("allows at most 3 a company per page, and moves the rest to the next page", () => {
    const list = jobs(`AAAAA${"BCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, 20)}`);
    const capped = capPerCompany(list, { window: 20, perCompany: 3 });
    expect(capped.slice(0, 20).filter((item) => item.company === "A")).toHaveLength(3);
    expect(capped).toHaveLength(list.length);
    // Pushed back, not dropped: the two left over lead the second page, still apart.
    expect(order(capped.slice(20))).toMatch(/^A.A/);
  });

  it("keeps the order when nothing breaks the rules, and fills a page from one company if that's all", () => {
    expect(order(capPerCompany(jobs("ABCABC")))).toBe("ABCABC");
    expect(order(capPerCompany(jobs("AAAAA")))).toBe("AAAAA");
  });
});
