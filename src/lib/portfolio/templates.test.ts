import { describe, expect, it } from "vitest";
import { templateGroups, templateOrder } from "./templates";
import { PORTFOLIO_TEMPLATE_IDS } from "./types";

describe("the design picker's groups", () => {
  it("lists every design exactly once, showpieces first", () => {
    const groups = templateGroups(PORTFOLIO_TEMPLATE_IDS);
    const listed = groups.flatMap((group) => group.ids);
    expect([...listed].sort()).toEqual([...PORTFOLIO_TEMPLATE_IDS].sort());
    expect(groups[0]?.label).toBe("Showpieces");
    expect(groups[0]?.ids[0]).toBe("reel");
    expect(groups[1]?.ids.at(-1)).toBe("cv");
  });

  it("puts a design no group names at the end, and drops empty groups", () => {
    expect(templateGroups(["cv", "reel"])).toEqual([
      { label: "Showpieces", ids: ["reel"] },
      { label: "Simple and clean", ids: ["cv"] },
    ]);
    expect(templateGroups(["navy"])).toEqual([{ label: "Showpieces", ids: ["navy"] }]);
  });

  it("gives one flat order for stepping through the designs", () => {
    expect(templateOrder(PORTFOLIO_TEMPLATE_IDS)).toEqual(
      templateGroups(PORTFOLIO_TEMPLATE_IDS).flatMap((group) => group.ids),
    );
  });
});
