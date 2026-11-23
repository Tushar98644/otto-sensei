import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { userSettings } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { optionalEmailRoom } from "./budget";
import type { BatchResult, EmailMessage, EmailSender } from "./email";
import {
  NOTICE_USAGE,
  parseNoticeArgs,
  processorNoticeCounts,
  processorNoticeEmail,
  processorNoticeLinks,
  publicBaseUrl,
  sendProcessorNotice,
  type NoticeRunInput,
} from "./processor-notice";

const HOUR = 60 * 60 * 1_000;
// Friday, November 20, 2026, 10:00 UTC.
const NOW = Date.UTC(2026, 10, 20, 10);
const STARTS_ON = Date.UTC(2026, 11, 1);
const LINKS = processorNoticeLinks("https://otto.test");

function fakeSender(
  answer?: (count: number) => BatchResult,
): EmailSender & { messages: EmailMessage[]; keys: string[] } {
  const messages: EmailMessage[] = [];
  const keys: string[] = [];
  return {
    messages,
    keys,
    async sendBatch(batch, key) {
      messages.push(...batch);
      keys.push(key);
      return answer ? answer(batch.length) : { sent: batch.length, failed: 0 };
    },
  };
}

const run = async (sender: EmailSender, input: Partial<NoticeRunInput> = {}) =>
  sendProcessorNotice(await getDb(), {
    startsOn: STARTS_ON,
    limit: null,
    now: NOW,
    sender,
    links: LINKS,
    ...input,
  });

const counts = async (limit: number | null = null, now = NOW) =>
  processorNoticeCounts(await getDb(), { limit, now });

const sentTo = (sender: { messages: EmailMessage[] }) =>
  sender.messages.map((message) => message.to).sort();

// Each account's record of the notice, from user_settings.notices.
async function noticeLog() {
  const rows = await (
    await getDb()
  )
    .select({ userId: userSettings.userId, notices: userSettings.notices })
    .from(userSettings);
  return rows.flatMap((row) =>
    Object.keys(row.notices ?? {})
      .filter((key) => key.startsWith("processor_notice:"))
      .map((key) => ({ userId: row.userId, occasion: key.slice("processor_notice:".length) })),
  );
}

describe("processorNoticeEmail", () => {
  const email = processorNoticeEmail({ to: "maya@example.com", startsOn: STARTS_ON, links: LINKS });

  it("names the day, both processors and links the updated pages", () => {
    expect(email.to).toBe("maya@example.com");
    expect(email.subject).toBe("Dodo Payments takes live payments for Otto Sensei from December 1");
    expect(email.text).toContain(
      "Dodo Payments now handles checkout for Otto Sensei in place of Paddle, and takes live payments from December 1, 2026.",
    );
    expect(email.text).toContain("merchant of record");
    expect(email.text).toContain("Terms: https://otto.test/terms");
    expect(email.text).toContain("Privacy policy: https://otto.test/privacy");
    expect(email.text).toContain("Refunds: https://otto.test/refunds");
    expect(email.text).toContain("Questions? Email hello@ottosensei.com.");
    expect(email.html).toContain('href="https://otto.test/terms"');
    expect(email.html).toContain('href="https://otto.test/privacy"');
    expect(email.html).toContain('href="https://otto.test/refunds"');
    expect(email.html).toContain('href="mailto:hello@ottosensei.com"');
    expect(email.html).toContain('src="https://otto.test/email/otto-head.png"');
    expect(email.tags).toEqual([{ name: "kind", value: "processor_notice" }]);
  });

  it("describes checkout as it already is when the email goes out, Dodo not Paddle", () => {
    expect(email.text).toContain(
      "When you start a checkout, we send Dodo Payments your account email, our random id for your account and the plan you pick, the same details Paddle used to get.",
    );
    expect(email.text).toContain("Dodo Payments is our online reseller and merchant of record.");
    expect(`${email.subject}\n${email.text}`).not.toMatch(
      /Paddle today|we'll send|will handle|becomes/,
    );
  });

  it("reads as a service notice: no unsubscribe, no refund promise of our own, nothing local", () => {
    expect(email.headers).toBeUndefined();
    expect(`${email.text}\n${email.html}`).not.toMatch(/unsubscribe/i);
    expect(email.text).toContain("it comes even if other emails are off");
    expect(email.text).not.toMatch(/within \d+ days|guarantee|money back/i);
    expect(`${email.subject}\n${email.text}`).not.toMatch(/₹|rupee|lakh|india/i);
  });

  it("escapes what goes into the HTML", () => {
    const odd = processorNoticeEmail({
      to: "maya@example.com",
      startsOn: STARTS_ON,
      links: { ...LINKS, terms: "https://otto.test/terms?a=1&b=<2>" },
    });
    expect(odd.html).toContain('href="https://otto.test/terms?a=1&amp;b=&lt;2&gt;"');
    expect(odd.html).toContain("We&#39;ve updated our terms");
  });
});

describe("parseNoticeArgs", () => {
  const parse = (...args: string[]) => parseNoticeArgs(args, NOW);

  it("is a dry run unless --apply is given", () => {
    expect(parse()).toEqual({ ok: true, args: { apply: false, startsOn: null, limit: null } });
    expect(parse("--date", "2026-12-01", "--limit", "40")).toEqual({
      ok: true,
      args: { apply: false, startsOn: STARTS_ON, limit: 40 },
    });
  });

  it("sends only with --apply and an explicit --date", () => {
    expect(parse("--apply")).toMatchObject({ ok: false, error: expect.stringContaining("--date") });
    expect(parse("--apply", "--date", "2026-12-01")).toEqual({
      ok: true,
      args: { apply: true, startsOn: STARTS_ON, limit: null },
    });
    expect(parse("--date=2026-12-01", "--apply", "--limit=5")).toEqual({
      ok: true,
      args: { apply: true, startsOn: STARTS_ON, limit: 5 },
    });
  });

  it("refuses a date that isn't a real day after today, or is over a year out", () => {
    for (const day of [
      "2026-02-30",
      "2026-13-01",
      "12/01/2026",
      "2026-12-1",
      "tomorrow",
      "2026-11-20",
      "2026-11-19",
      "2027-12-01",
    ]) {
      expect(parse("--apply", "--date", day).ok, day).toBe(false);
    }
    expect(parse("--apply", "--date", "2026-11-21").ok).toBe(true);
    expect(parse("--apply", "--date", "2027-11-20").ok).toBe(true);
  });

  it("refuses a bad limit, an unknown option and a missing value", () => {
    for (const limit of ["0", "-1", "1.5", "abc", "1e3", "10001", ""]) {
      expect(parse("--limit", limit).ok, limit).toBe(false);
    }
    expect(parse("--limit", "10000").ok).toBe(true);
    expect(parse("--date")).toMatchObject({ ok: false, error: "--date needs a value." });
    expect(parse("--date", "--apply")).toMatchObject({ ok: false });
    expect(parse("--send")).toMatchObject({ ok: false, error: "Unknown option: --send" });
    expect(parse("--apply=yes")).toMatchObject({ ok: false });
    expect(NOTICE_USAGE).toContain("Only counts are printed, never emails.");
  });
});

describe("publicBaseUrl", () => {
  it("accepts only an https site that isn't local", () => {
    expect(publicBaseUrl("https://www.ottosensei.com")).toBe(true);
    expect(publicBaseUrl("http://localhost:3000")).toBe(false);
    expect(publicBaseUrl("https://localhost:3000")).toBe(false);
    expect(publicBaseUrl("https://127.0.0.1")).toBe(false);
    expect(publicBaseUrl("http://www.ottosensei.com")).toBe(false);
    expect(publicBaseUrl("not a url")).toBe(false);
  });
});

describe("sendProcessorNotice", () => {
  beforeEach(async () => {
    await resetDb();
    delete process.env.OPTIONAL_EMAILS_PER_DAY;
  });

  afterEach(() => {
    delete process.env.OPTIONAL_EMAILS_PER_DAY;
  });

  it("counts without writing anything", async () => {
    await createUser("ada@example.com");
    await createUser("bo@example.com");
    const before = await counts();
    expect(before).toEqual({ accounts: 2, notified: 0, pending: 2, room: 25 });
    expect(await counts(1)).toMatchObject({ room: 1 });
    expect(await noticeLog()).toEqual([]);
  });

  it("emails every account once, whatever its email choices, and a rerun emails nobody again", async () => {
    const ada = await createUser("ada@example.com");
    const bo = await createUser("bo@example.com");
    await (await getDb()).insert(userSettings).values({
      userId: bo.id,
      emailReminders: false,
      tipEmails: false,
      jobEmails: false,
      updatedAt: 1,
    });
    const sender = fakeSender();

    const first = await run(sender);
    expect(first).toMatchObject({ claimed: 2, sent: 2, failed: 0, released: 0, stopped: null });
    expect(sentTo(sender)).toEqual(["ada@example.com", "bo@example.com"]);
    expect(sender.keys).toHaveLength(1);
    expect(sender.keys[0]).toMatch(/^processor-notice-[0-9a-f]{40}$/);
    expect((await noticeLog()).map((row) => row.userId).sort()).toEqual([ada.id, bo.id].sort());
    expect(await counts()).toMatchObject({ accounts: 2, notified: 2, pending: 0 });

    const again = await run(sender, { now: NOW + 3 * 24 * HOUR, startsOn: Date.UTC(2026, 11, 8) });
    expect(again).toMatchObject({ claimed: 0, sent: 0 });
    expect(sender.messages).toHaveLength(2);
  });

  it("skips an account without an email address", async () => {
    const blank = await createUser("cy@example.com");
    await (await getDb()).execute(sql`update users set email = '' where id = ${blank.id}`);
    await createUser("ada@example.com");
    expect(await counts()).toMatchObject({ accounts: 1, pending: 1 });
    const sender = fakeSender();
    await run(sender);
    expect(sentTo(sender)).toEqual(["ada@example.com"]);
  });

  it("sends at most --limit, and the next run picks up the rest", async () => {
    for (const name of ["a", "b", "c"]) await createUser(`${name}@example.com`);
    const sender = fakeSender();
    expect(await run(sender, { limit: 2 })).toMatchObject({ room: 2, claimed: 2, sent: 2 });
    expect(await counts()).toMatchObject({ pending: 1 });
    expect(await run(sender, { limit: 2 })).toMatchObject({ claimed: 1, sent: 1 });
    expect(sentTo(sender)).toEqual(["a@example.com", "b@example.com", "c@example.com"]);
  });

  it("without --limit, stays inside the day's optional email allowance and takes from it", async () => {
    process.env.OPTIONAL_EMAILS_PER_DAY = "2";
    for (const name of ["a", "b", "c"]) await createUser(`${name}@example.com`);
    const sender = fakeSender();
    expect(await run(sender)).toMatchObject({ room: 2, sent: 2 });
    expect(await optionalEmailRoom(NOW + HOUR)).toBe(0);
    expect(await run(sender, { now: NOW + HOUR })).toMatchObject({ room: 0, claimed: 0 });
    expect(await run(sender, { now: NOW + 21 * HOUR })).toMatchObject({ room: 2, sent: 1 });
    expect(sender.messages).toHaveLength(3);
  });

  it("sends in batches of at most 100", async () => {
    const db = await getDb();
    await db.execute(sql`insert into auth.users (id, email)
      select gen_random_uuid(), 'user' || n || '@example.com' from generate_series(1, 101) n`);
    await db.execute(sql`insert into users (id, email, created_at, updated_at)
      select id, email, 1, 1 from auth.users`);
    const sender = fakeSender();
    expect(await run(sender, { limit: 500 })).toMatchObject({ claimed: 101, sent: 101 });
    expect(sender.keys).toHaveLength(2);
    expect(new Set(sender.keys).size).toBe(2);
    expect(new Set(sender.messages.map((message) => message.to)).size).toBe(101);
  });

  it("releases a batch Resend refused, so a later run sends it", async () => {
    await createUser("ada@example.com");
    const refused = fakeSender((n) => ({ sent: 0, failed: n, refused: true }));
    expect(await run(refused)).toMatchObject({
      claimed: 1,
      sent: 0,
      released: 1,
      stopped: "refused",
    });
    expect(await noticeLog()).toEqual([]);
    const sender = fakeSender();
    expect(await run(sender, { now: NOW + HOUR })).toMatchObject({ sent: 1 });
    expect(sentTo(sender)).toEqual(["ada@example.com"]);
  });

  it("stops after a batch fails outright and keeps it logged, since it may have gone out", async () => {
    await createUser("ada@example.com");
    const down = fakeSender((n) => ({ sent: 0, failed: n }));
    expect(await run(down)).toMatchObject({ sent: 0, failed: 1, released: 0, stopped: "failed" });
    expect(await noticeLog()).toHaveLength(1);
    const sender = fakeSender();
    expect(await run(sender, { now: NOW + 48 * HOUR })).toMatchObject({ claimed: 0 });
    expect(sender.messages).toEqual([]);
  });

  it("records nothing beyond the notice and when it went, and counts it against the day's emails", async () => {
    const ada = await createUser("ada@example.com");
    await run(fakeSender());
    const db = await getDb();
    const [row] = await db
      .select({ notices: userSettings.notices, sentAt: userSettings.noticeSentAt })
      .from(userSettings)
      .where(eq(userSettings.userId, ada.id));
    expect(row).toEqual({ notices: { "processor_notice:paddle_to_dodo": NOW }, sentAt: NOW });
    await expect(
      db.execute(sql`update public.user_settings set notices = '[]' where user_id = ${ada.id}`),
    ).rejects.toThrow();
  });
});
