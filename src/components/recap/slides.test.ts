import { describe, expect, it } from "vitest";
import type { Recap } from "@/lib/recap/types";
import { momentumLine, slidesOf, stepCopy, viewsText } from "./slides";

function recap(overrides: Partial<Recap> = {}): Recap {
  return {
    version: 1,
    week: "2026-11-16",
    pro: true,
    quiet: false,
    effort: { applications: 0, tailored: 0, letters: 0, messages: 0, preps: 0, last: null },
    momentum: { replies: 0, interviews: 0, offers: 0, moves: [] },
    attention: { share: null, portfolio: null },
    working: null,
    jobs: null,
    activeDays: [],
    next: [],
    totals: { shareViews: 0, portfolioViews: 0 },
    builtAt: 0,
    ...overrides,
  };
}

describe("slidesOf", () => {
  it("shows only the slides with something in them, in order", () => {
    const slides = slidesOf(
      recap({
        effort: {
          applications: 4,
          tailored: 2,
          letters: 1,
          messages: 0,
          preps: 0,
          last: { applications: 2, tailored: 0, letters: 0 },
        },
        momentum: {
          replies: 2,
          interviews: 1,
          offers: 1,
          moves: [{ company: "Figma", role: "", path: ["interview", "offer"] }],
        },
        attention: { share: { views: 6, since: 1 }, portfolio: null },
        jobs: { matches: 38, best: { title: "Designer", company: "Stripe" }, saved: 3 },
        activeDays: ["2026-11-16", "2026-11-17"],
        next: [{ kind: "jobs", href: "/dashboard/jobs" }],
      }),
    );
    expect(slides.map((slide) => slide.kind)).toEqual([
      "opening",
      "effort",
      "momentum",
      "attention",
      "jobs",
      "days",
      "next",
    ]);
    expect(slides[0]?.text).toBe(
      "Your week with Otto, Nov 16–22. 4 applications, 1 offer and 1 interview.",
    );
    expect(slides[1]?.text).toBe(
      "4 applications sent, 2 tailored versions, 1 cover letter written. 2 more than last week.",
    );
    expect(slides[2]?.text).toBe(
      "You heard back from 2 companies, with 1 offer and 1 interview. Figma: Interviewing to Offer.",
    );
    expect(slides[3]?.text).toBe("Your resume was opened 6 times.");
    expect(slides[4]?.text).toBe(
      "38 new matches this week. Best match: Designer at Stripe. You saved 3 jobs.",
    );
  });

  it("gives a quiet week one warm slide with one step", () => {
    const slides = slidesOf(recap({ quiet: true, next: [{ kind: "upload", href: "/studio" }] }));
    expect(slides).toEqual([
      {
        kind: "quiet",
        tab: "Your week",
        text: "A quiet week, Nov 16–22. Weeks like this happen. One idea for this week: Add your resume.",
      },
    ]);
  });

  it("never lists what didn't happen", () => {
    expect(
      momentumLine(recap({ momentum: { replies: 1, interviews: 0, offers: 0, moves: [] } })),
    ).toBe("You heard back from 1 company.");
    expect(viewsText({ views: 14, since: null }, "portfolio")).toBe(
      "Your portfolio has 14 views so far.",
    );
    expect(stepCopy({ kind: "follow_up", company: "Notion", href: "/x" }).title).toBe(
      "Follow up with Notion",
    );
  });
});
