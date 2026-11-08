import { describe, expect, it } from "vitest";
import {
  EMAIL_LISTED,
  followUpEmail,
  followUpMessage,
  followUpNotice,
  type DueApplication,
} from "./follow-up";

const DAY = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 8);

let next = 0;
function due(company: string, daysAgo: number, role = ""): DueApplication {
  next += 1;
  return { id: `app-${next}`, company, role, appliedAt: NOW - daysAgo * DAY };
}

const LINKS = {
  to: "maya@example.com",
  now: NOW,
  applicationsUrl: "https://otto.test/dashboard/applications",
  settingsUrl: "https://otto.test/dashboard/account#reminders",
  actionUrls: (id: string) => ({
    done: `https://otto.test/reminder?do=done&a=${id}`,
    snooze: `https://otto.test/reminder?do=snooze&a=${id}`,
  }),
  unsubscribeUrl: "https://otto.test/api/notifications/unsubscribe?u=1&t=2",
  unsubscribePageUrl: "https://otto.test/reminder?do=unsubscribe&u=1&t=2",
  ottoHeadUrl: "https://otto.test/email/otto-head.png",
};

describe("followUpNotice", () => {
  it("names the one company, or counts the applications, oldest first", () => {
    expect(followUpNotice([due("Stripe", 7)], NOW)).toEqual({
      title: "Time to follow up with Stripe?",
      body: "It's been 7 days since you applied to Stripe. A short follow-up can help.",
      link: "/dashboard/applications",
    });
    expect(
      followUpNotice([due("Linear", 8), due("Stripe", 20), due("Figma", 10)], NOW),
    ).toMatchObject({
      title: "3 applications are ready for a follow-up",
      body: "Stripe, Figma and 1 more are ready for a follow-up. A short note can help.",
    });
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
    expect(followUpMessage([due("Stripe", 7), due("Linear", 9)], NOW).split(/\s+/).length).toBeLessThanOrEqual(18);
  });
});

describe("followUpEmail", () => {
  it("lists each application with one-click Done and Snooze, and links back", () => {
    const stripe = due("Stripe", 9, "Backend Engineer");
    const email = followUpEmail({ ...LINKS, applications: [stripe, due("Linear", 7)] });
    expect(email.subject).toBe("2 applications are ready for a follow-up");
    expect(email.text).toContain("Stripe and Linear are ready for a follow-up.");
    expect(email.text).toContain("- Stripe (Backend Engineer · applied 9 days ago)");
    expect(email.text).toContain(`  Done: https://otto.test/reminder?do=done&a=${stripe.id}`);
    expect(email.text).toContain(`  Snooze 3 days: https://otto.test/reminder?do=snooze&a=${stripe.id}`);
    expect(email.text).toContain("- Linear (applied 7 days ago)");
    expect(email.text).toContain(`Open your applications: ${LINKS.applicationsUrl}`);
    expect(email.text).toContain(`Unsubscribe in one click: ${LINKS.unsubscribePageUrl}`);
    expect(email.text).toContain(`Change when reminders come: ${LINKS.settingsUrl}`);
    expect(email.html).toContain(`href="${LINKS.applicationsUrl}"`);
    expect(email.html).toContain(`href="https://otto.test/reminder?do=done&amp;a=${stripe.id}"`);
    expect(email.html).toContain(">Snooze 3 days</a>");
    // Otto's head leads, as a PNG from the app's own address, since email clients drop SVG.
    expect(email.html).toMatch(
      /^<div[^>]*>\n<img src="https:\/\/otto\.test\/email\/otto-head\.png" width="48" height="48" alt="Otto"/,
    );
    expect(email.headers).toEqual({
      "List-Unsubscribe": `<${LINKS.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("escapes the user's own text in the HTML", () => {
    const email = followUpEmail({ ...LINKS, applications: [due('<img src=x onerror="hi">', 8, "R&D")] });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img src=x onerror=&quot;hi&quot;&gt;");
    expect(email.html).toContain("R&amp;D");
  });

  it("lists the first ten and counts the rest", () => {
    const many = Array.from({ length: EMAIL_LISTED + 4 }, (_, index) => due(`Company ${index}`, 7 + index));
    const email = followUpEmail({ ...LINKS, applications: many });
    expect(email.text.match(/^- Company/gm)).toHaveLength(EMAIL_LISTED);
    expect(email.text).toContain("- and 4 more");
  });

  it("falls back to the settings link and drops the buttons when links can't be signed", () => {
    const email = followUpEmail({
      ...LINKS,
      actionUrls: () => ({ done: null, snooze: null }),
      unsubscribeUrl: null,
      unsubscribePageUrl: null,
      applications: [due("Stripe", 7)],
    });
    expect(email.headers).toEqual({});
    expect(email.text).not.toContain("Done:");
    expect(email.text).toContain(`Unsubscribe in one click: ${LINKS.settingsUrl}`);
  });
});
