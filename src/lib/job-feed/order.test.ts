import { describe, expect, it } from "vitest";
import { capPerCompany, closeness, freshness } from "./order";

const DAY = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 9, 12);

describe("closeness", () => {
  const weights = new Map([
    ["JavaScript", 0.7],
    ["Elixir", 5.2],
    ["SQL", 0.9],
  ]);
  const weight = (skill: string) => weights.get(skill) ?? 1;

  it("counts a rare shared skill for more than a common one", () => {
    const rare = closeness({ found: ["Elixir"] }, ["Elixir", "SQL"], weight, true);
    const common = closeness({ found: ["JavaScript"] }, ["JavaScript", "SQL"], weight, true);
    expect(rare).toBeGreaterThan(common);
  });

  it("prefers a post the resume covers to one that asks for much more", () => {
    const covered = closeness({ found: ["Elixir", "SQL"] }, ["Elixir", "SQL"], weight, false);
    const partial = closeness(
      { found: ["Elixir", "SQL"] },
      ["Elixir", "SQL", "Go", "Rust", "Kafka"],
      weight,
      false,
    );
    expect(covered).toBeGreaterThan(partial);
  });

  it("adds a little for the same kind of role", () => {
    expect(closeness({ found: [] }, ["SQL"], weight, true)).toBeGreaterThan(
      closeness({ found: [] }, ["SQL"], weight, false),
    );
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
