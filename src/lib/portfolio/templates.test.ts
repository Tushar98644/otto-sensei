import { describe, expect, it } from "vitest";
import { templateGroups, templateOrder } from "./templates";
import { PORTFOLIO_TEMPLATE_IDS } from "./types";

describe("the design picker's groups", () => {
  it("lists every design exactly once, our picks first and Bento and Navy last", () => {
    const groups = templateGroups(PORTFOLIO_TEMPLATE_IDS);
    const listed = groups.flatMap((group) => group.ids);
    expect([...listed].sort()).toEqual([...PORTFOLIO_TEMPLATE_IDS].sort());
    expect(groups[0]).toEqual({ label: "Our picks", ids: ["paper", "gazette", "reel"] });
    expect(listed.slice(-2)).toEqual(["bento", "navy"]);
  });

  it("puts a design no group names at the end, and drops empty groups", () => {
    expect(templateGroups(["cv", "reel"])).toEqual([
      { label: "Our picks", ids: ["reel"] },
      { label: "More designs", ids: ["cv"] },
    ]);
    expect(templateGroups(["navy"])).toEqual([{ label: "More designs", ids: ["navy"] }]);
  });

  it("gives one flat order for stepping through the designs", () => {
    expect(templateOrder(PORTFOLIO_TEMPLATE_IDS)).toEqual(
      templateGroups(PORTFOLIO_TEMPLATE_IDS).flatMap((group) => group.ids),
    );
  });
});
