import { afterEach, describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/i18n/config";
import { checkinEmail, checkinNotice } from "@/lib/career-log/checkin-email";
import { followUpNotices, type DueApplication } from "./follow-up";
import { interviewSoonNotice } from "./interview-soon";
import { emailMessages } from "./locale";
import { processorNoticeEmail, processorNoticeLinks } from "./processor-notice";
import { trialEndingEmail, trialEndingNotice } from "./trial-ending";
import { unsubscribeCopy, unsubscribePage } from "./unsubscribe-page";
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

function render(locale: Locale) {
  const trial = { to: "maya@example.com", accountUrl: "https://otto.test/account?a=1&b=2", locale };
  const head = "https://otto.test/email/otto-head.png";
  const links = {
    ottoHeadUrl: head,
    settingsUrl: "https://otto.test/dashboard/account#reminders",
    unsubscribeUrl: "https://otto.test/api/notifications/unsubscribe?u=1&t=2&l=career",
  };
  const copy = unsubscribeCopy(locale);
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
      trialEndingNotice(
        { plan: "pro", interval: "year", endsAt: NOW + DAY, timeZone: null },
        locale,
      ),
      trialEndingNotice(
        { plan: "max", interval: "month", endsAt: NOW + DAY, timeZone: "America/Los_Angeles" },
        locale,
      ),
    ],
    checkinEmails: [
      checkinEmail({
        to: "maya@example.com",
        month: "2026-11",
        url: "https://otto.test/c?a=1&b=2",
        links,
        locale,
      }),
      checkinEmail({
        to: "maya@example.com",
        month: "2027-01",
        url: "https://otto.test/c",
        links: { ...links, unsubscribeUrl: null },
        locale,
      }),
    ],
    checkinNotices: [checkinNotice("2026-11", locale), checkinNotice("2027-05", locale)],
    processorNotice: processorNoticeEmail({
      to: "maya@example.com",
      startsOn: Date.UTC(2026, 11, 1),
      links: processorNoticeLinks("https://otto.test", locale),
      locale,
    }),
    unsubscribePages: [
      ...Object.values(copy.lists).flatMap((list) => [
        unsubscribePage({
          title: list.name,
          message: list.ask,
          action: "/api/notifications/unsubscribe?u=1&t=2&l=jobs&page=1",
          press: list.press,
          settingsUrl: links.settingsUrl,
          ottoHeadUrl: head,
          locale,
        }),
        unsubscribePage({
          title: list.name,
          message: list.done,
          action: null,
          press: "",
          settingsUrl: links.settingsUrl,
          ottoHeadUrl: head,
          locale,
        }),
      ]),
      unsubscribePage({
        title: copy.title,
        message: copy.invalid,
        action: null,
        press: "",
        settingsUrl: links.settingsUrl,
        ottoHeadUrl: head,
        locale,
      }),
    ],
    followUps: [
      followUpNotices([due("a1", "Stripe", 7)], NOW, locale),
      followUpNotices([due("a2", "Linear", 1, true)], NOW, locale),
      followUpNotices([due("a3", "  ", 3)], NOW, locale),
      followUpNotices([due("a4", "", 12, true)], NOW, locale),
      followUpNotices([due("a5", "Stripe", 7), due("a6", "Figma", 9)], NOW, locale),
      followUpNotices(
        [
          due("b1", "Stripe", 7),
          due("b2", "Figma", 9),
          due("b3", "Linear", 11),
          due("b4", "Vercel", 13),
        ],
        NOW,
        locale,
      ),
      followUpNotices(
        [due("c1", "Stripe", 7), due("c2", "Stripe", 9), due("c3", "", 11), due("c4", "", 13)],
        NOW,
        locale,
      ),
      followUpNotices(
        [due("d1", "", 7), due("d2", "", 9), due("d3", "", 11), due("d4", "", 13)],
        NOW,
        locale,
      ),
    ],
    interviews: [
      interviewSoonNotice(
        { id: "i1", company: "Stripe", role: "Backend Engineer", interviewAt: NOW + 3_600_000 },
        NOW,
        "Europe/London",
        locale,
      ),
      interviewSoonNotice(
        { id: "i2", company: "", role: "", interviewAt: Date.UTC(2026, 10, 21, 12) },
        NOW,
        null,
        locale,
      ),
      interviewSoonNotice(
        { id: "i3", company: "Figma", role: "", interviewAt: Date.UTC(2026, 10, 22, 2) },
        NOW,
        null,
        locale,
      ),
    ],
    views: [
      shareViewNotice("Maya Chen, Stripe", 3, locale),
      shareViewNotice("", 1, locale),
      shareViewNotice("  ", 1_204, locale),
      portfolioViewsNotice(12, NOW - 7 * DAY, NOW, locale),
      portfolioViewsNotice(1, Date.UTC(2026, 10, 2), NOW, locale),
    ],
    jobs: [
      matchesNotice({ fresh: 1, names: ["Designer at Figma"], free: false }, locale),
      matchesNotice({ fresh: 2, names: ["A at X", "B at Y"], free: false }, locale),
      matchesNotice({ fresh: 9, names: ["A at X", "B at Y"], free: true }, locale),
      matchesNotice({ fresh: 3, names: [], free: true }, locale),
    ],
  };
}

function renderAll(locale: Locale) {
  const plain = render(locale).checkinEmails;
  process.env.EMAIL_POSTAL_ADDRESS = "1 Main St, Springfield";
  return { ...render(locale), checkinWithoutAddress: plain };
}

// The fixed words of every English message, two words or longer, as they would sit in the output.
function englishFragments(tree: unknown): string[] {
  if (typeof tree === "string") {
    return tree
      .split(/\{\w+\}/)
      .map((part) => part.trim())
      .filter((part) => /\p{L}+\s+\p{L}+/u.test(part));
  }
  return Object.values(tree as Record<string, unknown>).flatMap(englishFragments);
}

describe("emails and notices", () => {
  afterEach(() => {
    delete process.env.EMAIL_POSTAL_ADDRESS;
  });

  it("read in English exactly as they did before languages", async () => {
    await expect(`${JSON.stringify(renderAll("en"), null, 2)}\n`).toMatchFileSnapshot(GOLDEN);
  });

  it.each(LOCALES.filter((locale) => locale !== "en"))(
    "read in %s, with no English sentence left",
    (locale) => {
      const english = renderAll("en");
      const translated = renderAll(locale);
      expect(Object.keys(translated)).toEqual(Object.keys(english));
      const output = JSON.stringify(translated).replaceAll("&#39;", "'");
      const leftovers = englishFragments(emailMessages("en")).filter((part) =>
        output.includes(part),
      );
      expect(leftovers).toEqual([]);
      expect(output).toContain(`lang=\\"${locale}\\"`);
    },
  );
});
