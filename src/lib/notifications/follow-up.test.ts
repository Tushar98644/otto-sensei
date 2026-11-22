import { describe, expect, it } from "vitest";
import {
  FOLLOW_UP_ROWS,
  followUpMessage,
  followUpNotice,
  followUpNotices,
  type DueApplication,
} from "./follow-up";

const DAY = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 8);

let next = 0;
function due(company: string, daysAgo: number, role = ""): DueApplication {
  next += 1;
  return { id: `app-${next}`, company, role, appliedAt: NOW - daysAgo * DAY };
}

describe("followUpNotice", () => {
  it("names the one company, or counts the applications, oldest first", () => {
    const stripe = due("Stripe", 7);
    expect(followUpNotice([stripe], NOW)).toEqual({
      title: "Time to follow up with Stripe?",
      body: "It's been 7 days since you applied to Stripe. A short follow-up can help.",
      link: `/dashboard/applications/${stripe.id}`,
      applicationId: stripe.id,
    });
    expect(
      followUpNotice([due("Linear", 8), due("Stripe", 20), due("Figma", 10)], NOW),
    ).toMatchObject({
      title: "3 applications are ready for a follow-up",
      body: "Stripe, Figma and 1 more are ready for a follow-up. A short note can help.",
      link: "/dashboard/applications",
      applicationId: null,
    });
  });

  it("gives each of a few its own row, oldest first, and folds more into one", () => {
    const few = [due("Linear", 8), due("Stripe", 20), due("Figma", 10)];
    expect(few).toHaveLength(FOLLOW_UP_ROWS);
    expect(followUpNotices(few, NOW).map((notice) => notice.title)).toEqual([
      "Time to follow up with Stripe?",
      "Time to follow up with Figma?",
      "Time to follow up with Linear?",
    ]);
    const many = [...few, due("Notion", 9)];
    expect(followUpNotices(many, NOW)).toEqual([followUpNotice(many, NOW)]);
    expect(followUpNotices([], NOW)).toEqual([]);
  });

  it("copes with a blank company and caps a very long one", () => {
    expect(followUpNotice([due("  ", 7)], NOW).title).toBe("Time to follow up?");
    const long = followUpNotice([due("A".repeat(300), 7)], NOW);
    expect(long.title.length).toBeLessThanOrEqual(120);
    expect(long.title).toContain("…");
  });
});

describe("followUpMessage", () => {
  it("says day for one day and stays a short line", () => {
    expect(followUpMessage([due("Stripe", 1)], NOW)).toBe(
      "It's been 1 day since you applied to Stripe. A short follow-up can help.",
    );
    expect(
      followUpMessage([due("Stripe", 7), due("Linear", 9)], NOW).split(/\s+/).length,
    ).toBeLessThanOrEqual(18);
  });
});
