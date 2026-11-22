import { describe, expect, it } from "vitest";
import type { Recap } from "@/lib/recap/types";
import { imageNames, imageStats } from "./save-image";

const recap: Recap = {
  version: 1,
  week: "2026-11-16",
  pro: true,
  quiet: false,
  effort: { applications: 4, tailored: 0, letters: 1, messages: 2, preps: 0, last: null },
  momentum: {
    replies: 2,
    interviews: 1,
    offers: 1,
    moves: [{ company: "Figma", role: "Designer", path: ["interview", "offer"] }],
  },
  attention: { share: { views: 6, since: 1 }, portfolio: null },
  working: null,
  jobs: { matches: 30, best: { title: "Product Designer", company: "Stripe" }, saved: 0 },
  activeDays: ["2026-11-16", "2026-11-17"],
  next: [],
  totals: { shareViews: 20, portfolioViews: 0 },
  builtAt: 0,
};

describe("the saved image", () => {
  it("shows only numbers that aren't zero, at most six", () => {
    expect(imageStats(recap)).toEqual([
      { value: 4, label: "applications sent" },
      { value: 1, label: "cover letter" },
      { value: 1, label: "interview" },
      { value: 1, label: "offer" },
      { value: 2, label: "days with Otto" },
      { value: 30, label: "new matches" },
    ]);
  });

  it("names companies only on request, from the moves and the best match", () => {
    expect(imageNames(recap)).toEqual([
      "Figma: Interviewing to Offer",
      "Best match: Product Designer, Stripe",
    ]);
  });
});
