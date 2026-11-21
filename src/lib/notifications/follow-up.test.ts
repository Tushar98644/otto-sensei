import { describe, expect, it } from "vitest";
import {
  EMAIL_LISTED,
  FOLLOW_UP_ROWS,
  followUpEmail,
  followUpMessage,
  followUpNotice,
  followUpNotices,
  type DueApplication,
} from "./follow-up";
import type { InterviewEmailLine } from "./interview-soon";

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
    write: null,
  }),
  unsubscribeUrl: "https://otto.test/api/notifications/unsubscribe?u=1&t=2",
  unsubscribePageUrl: "https://otto.test/reminder?do=unsubscribe&u=1&t=2",
  ottoHeadUrl: "https://otto.test/email/otto-head.png",
};

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
      actionUrls: () => ({ done: null, snooze: null, write: null }),
      unsubscribeUrl: null,
      unsubscribePageUrl: null,
      applications: [due("Stripe", 7)],
    });
    expect(email.headers).toEqual({});
    expect(email.text).not.toContain("Done:");
    expect(email.text).toContain(`Unsubscribe in one click: ${LINKS.settingsUrl}`);
  });

  it("offers Write it for me first when the account can write, and says what it does", () => {
    const stripe = due("Stripe", 9);
    const write = `https://otto.test/dashboard/applications/${stripe.id}?write=follow-up`;
    const email = followUpEmail({
      ...LINKS,
      actionUrls: (id) => ({ ...LINKS.actionUrls(id), write }),
      applications: [stripe],
    });
    expect(email.text).toContain(`- Stripe (applied 9 days ago)\n  Write it for me: ${write}\n  Done:`);
    expect(email.text).toContain("Press Write it for me and Otto drafts one from your resume.");
    expect(email.html).toContain(`href="${write}" style="color:#12241d;font-weight:600">Write it for me</a>`);
    expect(followUpEmail({ ...LINKS, applications: [stripe] }).text).not.toContain("Write it for me");
  });
});

const tomorrow = (company: string, id: string): InterviewEmailLine => ({
  title: `Your interview with ${company} is tomorrow`,
  detail: "Backend Engineer",
  prepUrl: `https://otto.test/dashboard/applications/${id}/prep?start=1`,
});

describe("followUpEmail with interviews", () => {
  it("leads with one interview and makes its prep the button when nothing else is due", () => {
    const email = followUpEmail({ ...LINKS, applications: [], interviews: [tomorrow("Stripe", "a1")] });
    expect(email.subject).toBe("Your interview with Stripe is tomorrow");
    expect(email.text.startsWith(
      "Your interview with Stripe is tomorrow. Go over the likely questions in your prep before you go.",
    )).toBe(true);
    expect(email.text).toContain("Open your prep: https://otto.test/dashboard/applications/a1/prep?start=1");
    expect(email.text).not.toContain("Open your applications");
    expect(email.text).not.toContain("follow-up");
    expect(email.html).toContain(
      `href="https://otto.test/dashboard/applications/a1/prep?start=1" style="display:inline-block`,
    );
    expect(email.tags).toEqual([{ name: "kind", value: "interview_soon" }]);
    expect(email.headers?.["List-Unsubscribe"]).toBe(`<${LINKS.unsubscribeUrl}>`);
  });

  it("puts interviews before follow-ups in one email, each interview with its prep", () => {
    const stripe = due("Stripe", 9);
    const one = followUpEmail({ ...LINKS, applications: [stripe], interviews: [tomorrow("Figma", "f1")] });
    expect(one.subject).toBe("Your interview with Figma is tomorrow");
    expect(one.text.indexOf("Figma")).toBeLessThan(one.text.indexOf("Stripe"));
    expect(one.text).toContain("Open your prep: https://otto.test/dashboard/applications/f1/prep?start=1");
    expect(one.text).toContain(`Open your applications: ${LINKS.applicationsUrl}`);
    expect(one.tags).toEqual([{ name: "kind", value: "application_follow_up" }]);

    const two = followUpEmail({
      ...LINKS,
      applications: [],
      interviews: [tomorrow("Figma", "f1"), tomorrow("<Acme>", "a2")],
    });
    expect(two.subject).toBe("You have 2 interviews coming up");
    expect(two.text).toContain(
      "- Your interview with Figma is tomorrow (Backend Engineer)\n  Open your prep: https://otto.test/dashboard/applications/f1/prep?start=1",
    );
    expect(two.html).toContain("Your interview with &lt;Acme&gt; is tomorrow");
    expect(two.html).not.toContain("<Acme>");
    expect(two.text).toContain(`Open your applications: ${LINKS.applicationsUrl}`);
  });
});
