import { afterEach, describe, expect, it } from "vitest";
import { checkinEmail, checkinNotice } from "@/lib/career-log/checkin-email";
import { followUpNotices, type DueApplication } from "./follow-up";
import { interviewSoonNotice } from "./interview-soon";
import { processorNoticeEmail, processorNoticeLinks } from "./processor-notice";
import { trialEndingEmail, trialEndingNotice } from "./trial-ending";
import { INVALID_LINK, UNSUBSCRIBE_COPY, unsubscribePage } from "./unsubscribe-page";
import { portfolioViewsNotice, shareViewNotice } from "./view-alerts";
import { matchesNotice } from "./weekly-jobs";

// Every email and bell notice in English, saved before the builders took a locale: English must never change.

const DAY = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 20, 14, 0, 0);
const GOLDEN = "./golden/english.json";

function due(id: string, company: string, daysAgo: number, interviewed = false): DueApplication {
  const at = NOW - daysAgo * DAY;
  return { id, company, role: "Engineer", appliedAt: at, interviewedAt: interviewed ? at : null };
}

function render() {
  const trial = { to: "maya@example.com", accountUrl: "https://otto.test/account?a=1&b=2" };
  const head = "https://otto.test/email/otto-head.png";
  const links = {
    ottoHeadUrl: head,
    settingsUrl: "https://otto.test/dashboard/account#reminders",
    unsubscribeUrl: "https://otto.test/api/notifications/unsubscribe?u=1&t=2&l=career",
  };
  return {
    trialEmails: [
      trialEndingEmail({
        ...trial,
        plan: "pro",
        interval: "month",
        endsAt: NOW + DAY,
        timeZone: null,
        ottoHeadUrl: head,
      }),
      trialEndingEmail({
        ...trial,
        plan: "max",
        interval: "year",
        endsAt: NOW + DAY,
        timeZone: "Australia/Sydney",
        ottoHeadUrl: head,
      }),
    ],
    trialNotices: [
      trialEndingNotice({ plan: "pro", interval: "year", endsAt: NOW + DAY, timeZone: null }),
      trialEndingNotice({
        plan: "max",
        interval: "month",
        endsAt: NOW + DAY,
        timeZone: "America/Los_Angeles",
      }),
    ],
    checkinEmails: [
      checkinEmail({
        to: "maya@example.com",
        month: "2026-11",
        url: "https://otto.test/c?a=1&b=2",
        links,
      }),
      checkinEmail({
        to: "maya@example.com",
        month: "2027-01",
        url: "https://otto.test/c",
        links: { ...links, unsubscribeUrl: null },
      }),
    ],
    checkinNotices: [checkinNotice("2026-11"), checkinNotice("2027-05")],
    processorNotice: processorNoticeEmail({
      to: "maya@example.com",
      startsOn: Date.UTC(2026, 11, 1),
      links: processorNoticeLinks("https://otto.test"),
    }),
    unsubscribePages: [
      ...Object.values(UNSUBSCRIBE_COPY).flatMap((copy) => [
        unsubscribePage({
          title: copy.name,
          message: copy.ask,
          action: "/api/notifications/unsubscribe?u=1&t=2&l=jobs&page=1",
          press: copy.press,
          settingsUrl: links.settingsUrl,
          ottoHeadUrl: head,
        }),
        unsubscribePage({
          title: copy.name,
          message: copy.done,
          action: null,
          press: "",
          settingsUrl: links.settingsUrl,
          ottoHeadUrl: head,
        }),
      ]),
      unsubscribePage({
        title: "Unsubscribe",
        message: INVALID_LINK,
        action: null,
        press: "",
        settingsUrl: links.settingsUrl,
        ottoHeadUrl: head,
      }),
    ],
    followUps: [
      followUpNotices([due("a1", "Stripe", 7)], NOW),
      followUpNotices([due("a2", "Linear", 1, true)], NOW),
      followUpNotices([due("a3", "  ", 3)], NOW),
      followUpNotices([due("a4", "", 12, true)], NOW),
      followUpNotices([due("a5", "Stripe", 7), due("a6", "Figma", 9)], NOW),
      followUpNotices(
        [
          due("b1", "Stripe", 7),
          due("b2", "Figma", 9),
          due("b3", "Linear", 11),
          due("b4", "Vercel", 13),
        ],
        NOW,
      ),
      followUpNotices(
        [due("c1", "Stripe", 7), due("c2", "Stripe", 9), due("c3", "", 11), due("c4", "", 13)],
        NOW,
      ),
      followUpNotices(
        [due("d1", "", 7), due("d2", "", 9), due("d3", "", 11), due("d4", "", 13)],
        NOW,
      ),
    ],
    interviews: [
      interviewSoonNotice(
        { id: "i1", company: "Stripe", role: "Backend Engineer", interviewAt: NOW + 3_600_000 },
        NOW,
        "Europe/London",
      ),
      interviewSoonNotice(
        { id: "i2", company: "", role: "", interviewAt: Date.UTC(2026, 10, 21, 12) },
        NOW,
        null,
      ),
      interviewSoonNotice(
        { id: "i3", company: "Figma", role: "", interviewAt: Date.UTC(2026, 10, 22, 2) },
        NOW,
        null,
      ),
    ],
    views: [
      shareViewNotice("Maya Chen, Stripe", 3),
      shareViewNotice("", 1),
      shareViewNotice("  ", 1_204),
      portfolioViewsNotice(12, NOW - 7 * DAY, NOW),
      portfolioViewsNotice(1, Date.UTC(2026, 10, 2), NOW),
    ],
    jobs: [
      matchesNotice({ fresh: 1, names: ["Designer at Figma"], free: false }),
      matchesNotice({ fresh: 2, names: ["A at X", "B at Y"], free: false }),
      matchesNotice({ fresh: 9, names: ["A at X", "B at Y"], free: true }),
      matchesNotice({ fresh: 3, names: [], free: true }),
    ],
  };
}

describe("English emails and notices", () => {
  afterEach(() => {
    delete process.env.EMAIL_POSTAL_ADDRESS;
  });

  it("read exactly as they did before languages", async () => {
    const plain = render().checkinEmails;
    process.env.EMAIL_POSTAL_ADDRESS = "1 Main St, Springfield";
    const all = { ...render(), checkinWithoutAddress: plain };
    await expect(`${JSON.stringify(all, null, 2)}\n`).toMatchFileSnapshot(GOLDEN);
  });
});
