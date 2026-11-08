import { describe, expect, it } from "vitest";
import { FEATURES, type UsageSnapshot } from "@/config/plans";
import { nearestLimit } from "./near-limit";

const usage = (counts: Partial<Record<keyof UsageSnapshot, [number, number]>>) =>
  Object.fromEntries(
    Object.entries(counts).map(([feature, [used, limit]]) => [feature, { used, limit }]),
  ) as Partial<UsageSnapshot>;

describe("nearestLimit", () => {
  it("stays quiet below 80% of every meter", () => {
    expect(nearestLimit(usage({ tailor: [7, 10], fix: [39, 50] }), FEATURES)).toBeNull();
    expect(nearestLimit(null, FEATURES)).toBeNull();
  });

  it("picks the fullest meter once one reaches 80%", () => {
    expect(nearestLimit(usage({ tailor: [8, 10], fix: [49, 50] }), FEATURES)).toEqual({
      feature: "fix",
      used: 49,
      limit: 50,
    });
    expect(nearestLimit(usage({ tailor: [12, 10] }), FEATURES)?.feature).toBe("tailor");
  });

  it("only looks at the meters it's given, and skips missing or zero limits", () => {
    const counts = usage({ import: [10, 10], github: [3, 0] });
    expect(nearestLimit(counts, ["tailor", "fix"])).toBeNull();
    expect(nearestLimit(counts, FEATURES)?.feature).toBe("import");
  });
});
