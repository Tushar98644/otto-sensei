import { describe, expect, it } from "vitest";
import { nudgeMessage, NO_REPLY_AFTER_DAYS, waitingTooLong } from "./nudge";
import type { ApplicationStatus } from "./status";

const DAY_MS = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 7, 12);

const app = (company: string, status: ApplicationStatus, daysAgo: number) => ({
  company,
  status,
  appliedAt: NOW - daysAgo * DAY_MS,
});

describe("waitingTooLong", () => {
  it(`finds applications still on applied after ${NO_REPLY_AFTER_DAYS} days, oldest first`, () => {
    const list = [
      app("Fresh", "applied", 20),
      app("Exactly 21", "applied", 21),
      app("Old", "applied", 60),
      app("Replied", "screening", 60),
      app("Closed", "no_reply", 60),
    ];
    expect(waitingTooLong(list, NOW).map((item) => item.company)).toEqual(["Old", "Exactly 21"]);
    expect(waitingTooLong([], NOW)).toEqual([]);
  });
});

describe("nudgeMessage", () => {
  it("names up to two companies and counts the rest", () => {
    expect(nudgeMessage([app("Stripe", "applied", 30)])).toBe(
      "Stripe hasn't replied in 3 weeks. Mark it as no reply?",
    );
    expect(nudgeMessage([app("Stripe", "applied", 30), app("Linear", "applied", 30)])).toBe(
      "Stripe and Linear haven't replied in 3 weeks. Mark them as no reply?",
    );
    expect(
      nudgeMessage(["Stripe", "Linear", "Figma", "Notion"].map((name) => app(name, "applied", 30))),
    ).toBe("Stripe, Linear and 2 more haven't replied in 3 weeks. Mark them as no reply?");
  });

  it("stays short, in Otto's 18-word budget", () => {
    const long = Array.from({ length: 40 }, (_, index) => app(`Company ${index}`, "applied", 30));
    expect(nudgeMessage(long).split(/\s+/).length).toBeLessThanOrEqual(18);
  });
});
