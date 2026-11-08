import { describe, expect, it } from "vitest";
import { hasInventedNumbers, maskInventedNumbers, novelWordShare } from "./guards";

describe("hasInventedNumbers", () => {
  it("accepts numbers the sources contain, however they're formatted", () => {
    expect(hasInventedNumbers("Cut costs 30%", ["cut costs by 30 percent"])).toBe(false);
    expect(hasInventedNumbers("Migrated 1,200 services", ["moved 1200 services"])).toBe(false);
    expect(hasInventedNumbers("Grew revenue to $2M", ["about 2 million dollars"])).toBe(false);
    expect(hasInventedNumbers("Led 2 engineers", ["led two engineers"])).toBe(false);
  });

  it("flags numbers the sources don't contain", () => {
    expect(hasInventedNumbers("Cut costs 40%", ["cut costs by 30 percent"])).toBe(true);
    expect(hasInventedNumbers("8 years of experience", ["Since 2016"])).toBe(true);
  });

  it("ignores digits that are part of a name", () => {
    expect(hasInventedNumbers("Stored files in S3 and built HTML5 pages with 2FA", [])).toBe(false);
  });
});

describe("maskInventedNumbers", () => {
  it("swaps invented numbers for a placeholder and keeps real ones", () => {
    expect(maskInventedNumbers("Served 2M users with 99.9% uptime", ["2 million users"])).toBe(
      "Served 2M users with [number] uptime",
    );
  });

  it("leaves existing placeholders alone", () => {
    expect(maskInventedNumbers("Cut time [X%] for 3 teams", ["three teams"])).toBe(
      "Cut time [X%] for 3 teams",
    );
    expect(maskInventedNumbers("Cut time by [2-3 hours] for 5 teams", [])).toBe(
      "Cut time by [2-3 hours] for [number] teams",
    );
  });
});

describe("novelWordShare", () => {
  it("is 0 for copied text and 1 for unrelated text", () => {
    const source = "Built the payments API at Acme";
    expect(novelWordShare(["Built the payments API", "Acme"], source)).toBe(0);
    expect(novelWordShare(["Spearheaded growth"], source)).toBe(1);
    expect(novelWordShare([], source)).toBe(0);
  });

  it("measures the share of new words", () => {
    expect(novelWordShare(["Built the new payments API"], "built the payments api")).toBeCloseTo(0.2);
  });
});
