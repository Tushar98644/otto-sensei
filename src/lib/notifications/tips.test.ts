import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  emailLog,
  matchEvents,
  notificationSettings,
  resumes,
  trialWatch,
  usage,
  users,
} from "@/db/schema";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { emptyResume } from "@/lib/resume/schema";
import { saveEmailChoices } from "./choices";
import { cycleKey } from "@/lib/usage";
import type { BatchResult, EmailMessage, EmailSender } from "./email";
import { runTipEmails } from "./tips";

const HOUR = 60 * 60 * 1_000;
const DAY = 24 * HOUR;
// Wednesday, December 2, 14:45 UTC: Free's line fixes came back on the 1st.
const NOW = Date.UTC(2026, 11, 2, 14, 45);
const context = (now = NOW) => ({ now, deadline: Date.now() + 30_000 });

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

async function addResume(userId: string, updatedAt: number) {
  const resume = emptyResume(updatedAt);
  await (await getDb()).insert(resumes).values({
    userId,
    id: resume.id,
    data: resume,
    createdAt: updatedAt,
    updatedAt,
  });
}

async function usedFixes(userId: string, period: string, count: number) {
  await (await getDb()).insert(usage).values({ subject: userId, feature: "fix", period, count });
}

async function logOf(userId: string) {
  return (await getDb())
    .select({ kind: emailLog.kind, occasion: emailLog.occasion })
    .from(emailLog)
    .where(eq(emailLog.userId, userId));
}

const sentTo = (sender: { messages: EmailMessage[] }) =>
  sender.messages.map((message) => `${message.to} ${message.tags?.[0]?.value ?? ""}`).sort();

describe("runTipEmails", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.NEXT_PUBLIC_APP_URL = "https://otto.test";
    process.env.CRON_SECRET = "cron-secret-for-tests-0123456789";
    process.env.EMAIL_POSTAL_ADDRESS = "PO Box 100, Springfield";
    resetEnvForTests();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.CRON_SECRET;
    delete process.env.EMAIL_POSTAL_ADDRESS;
    delete process.env.OPTIONAL_EMAILS_PER_DAY;
    resetEnvForTests();
  });

  it("picks who gets which tip, and sends each one once", async () => {
    await createUser("new@example.com", NOW - 3 * DAY);
    await createUser("too-new@example.com", NOW - DAY);
    await createUser("too-late@example.com", NOW - 8 * DAY);
    const started = await createUser("started@example.com", NOW - 3 * DAY);
    await addResume(started.id, NOW - 2 * DAY);
    const optedOut = await createUser("opted-out@example.com", NOW - 3 * DAY);
    await saveEmailChoices(optedOut.id, { tipEmails: false }, NOW - 3 * DAY);

    const fixer = await createUser("fixer@example.com", NOW - 20 * DAY);
    await usedFixes(fixer.id, "2026-11", 2);
    const fixedToday = await createUser("fixed-today@example.com", NOW - 20 * DAY);
    await usedFixes(fixedToday.id, "2026-11", 3);
    await usedFixes(fixedToday.id, "2026-12", 1);
    const paid = await setPlan(await createUser("paid@example.com", NOW - 20 * DAY), "pro");
    await usedFixes(paid.id, "2026-11", 2);

    const quiet = await createUser("quiet@example.com", NOW - 45 * DAY);
    await addResume(quiet.id, NOW - 40 * DAY);
    const busy = await createUser("busy@example.com", NOW - 45 * DAY);
    await addResume(busy.id, NOW - 5 * DAY);
    const gone = await createUser("gone@example.com", NOW - 100 * DAY);
    await addResume(gone.id, NOW - 90 * DAY);
    const browsing = await createUser("browsing@example.com", NOW - 45 * DAY);
    await addResume(browsing.id, NOW - 40 * DAY);
    await (await getDb()).insert(matchEvents).values({
      id: crypto.randomUUID(),
      userId: browsing.id,
      kind: "impression",
      jobId: crypto.randomUUID(),
      variant: "test",
      createdAt: NOW - 2 * DAY,
    });

    const sender = fakeSender();
    const outcome = await runTipEmails(context(), { sender });

    expect(outcome).toEqual({
      stats: {
        users: 3,
        emailsSent: 3,
        emailsFailed: 0,
        released: 0,
        trial_ended: 0,
        no_resume: 1,
        fixes_back: 1,
        win_back: 1,
      },
      complete: true,
      failed: [],
    });
    expect(sentTo(sender)).toEqual([
      "fixer@example.com fixes_back",
      "new@example.com no_resume",
      "quiet@example.com win_back",
    ]);
    expect(await logOf(fixer.id)).toEqual([{ kind: "fixes_back", occasion: "2026-12" }]);
    expect(await logOf(quiet.id)).toEqual([{ kind: "win_back", occasion: "once" }]);

    const sameDay = fakeSender();
    expect((await runTipEmails(context(NOW + HOUR), { sender: sameDay })).stats.users).toBe(0);
    expect(sameDay.messages).toHaveLength(0);

    // Days later only the account that has since been around two days qualifies.
    const later = fakeSender();
    await runTipEmails(context(NOW + 4 * DAY), { sender: later });
    expect(sentTo(later)).toEqual(["too-new@example.com no_resume"]);
  });

  it("writes each email with its list's one-click unsubscribe link and the settings link", async () => {
    await createUser("new@example.com", NOW - 3 * DAY);
    const sender = fakeSender();
    await runTipEmails(context(), { sender });

    const [message] = sender.messages;
    expect(message?.subject).toBe("Your resume isn't in Otto Sensei yet");
    const header = message?.headers?.["List-Unsubscribe"] ?? "";
    expect(header).toMatch(
      /^<https:\/\/otto\.test\/api\/notifications\/unsubscribe\?u=[0-9a-f-]{36}&t=[\w-]{43}&l=tips>$/,
    );
    expect(message?.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(message?.text).toContain(
      "https://otto.test/dashboard/resumes?utm_source=otto&utm_medium=email&utm_campaign=tips&utm_content=no_resume",
    );
    expect(message?.text).toContain(
      "Email settings: https://otto.test/dashboard/account?utm_source=otto&utm_medium=email&utm_campaign=tips&utm_content=settings#reminders",
    );
    expect(message?.html).not.toContain("<script");
    expect(message?.text).toContain("Otto Sensei, PO Box 100, Springfield");
    expect(message?.html).toContain("Otto Sensei, PO Box 100, Springfield");
  });

  it("holds every tip until a sender postal address is set", async () => {
    delete process.env.EMAIL_POSTAL_ADDRESS;
    const newbie = await createUser("new@example.com", NOW - 3 * DAY);
    const outcome = await runTipEmails(context(), { sender: fakeSender() });
    expect(outcome.stats).toMatchObject({ users: 0, noAddress: 1 });
    expect(await logOf(newbie.id)).toEqual([]);
  });

  it("doesn't call an account quiet that used Otto's AI in the past month", async () => {
    const free = await createUser("free@example.com", NOW - 45 * DAY);
    await addResume(free.id, NOW - 40 * DAY);
    await (
      await getDb()
    )
      .insert(usage)
      .values({ subject: free.id, feature: "tailor", period: "2026-11", count: 1 });
    const paid = await setPlan(await createUser("paid@example.com", NOW - 45 * DAY), "pro");
    await addResume(paid.id, NOW - 40 * DAY);
    await usedFixes(paid.id, cycleKey(NOW - 40 * DAY), 1);
    const quiet = await createUser("quiet@example.com", NOW - 45 * DAY);
    await addResume(quiet.id, NOW - 40 * DAY);
    await usedFixes(quiet.id, "2026-10", 2);
    await usedFixes(quiet.id, cycleKey(NOW - 80 * DAY), 2);

    const sender = fakeSender();
    await runTipEmails(context(), { sender });
    expect(sentTo(sender)).toEqual(["quiet@example.com win_back"]);
  });

  it("gives the tips back when Resend turns the whole batch away", async () => {
    const newbie = await createUser("new@example.com", NOW - 3 * DAY);
    const refused = await runTipEmails(context(), {
      sender: fakeSender((count) => ({ sent: 0, failed: count, refused: true })),
    });
    expect(refused.stats).toMatchObject({ users: 1, emailsFailed: 1, released: 1 });
    expect(await logOf(newbie.id)).toEqual([]);

    const unknown = await runTipEmails(context(NOW + DAY), {
      sender: fakeSender((count) => ({ sent: 0, failed: count })),
    });
    expect(unknown.stats).toMatchObject({ users: 1, released: 0 });
    expect(await logOf(newbie.id)).toEqual([{ kind: "no_resume", occasion: "once" }]);
  });

  it("tells a trial that ended unpaid, a day later, and no one who paid", async () => {
    const endsAt = NOW + DAY;
    const lapsed = await setPlan(
      await createUser("lapsed@example.com", NOW - 10 * DAY),
      "trial",
      endsAt,
    );
    const kept = await setPlan(
      await createUser("kept@example.com", NOW - 10 * DAY),
      "trial",
      endsAt,
    );
    await addResume(lapsed.id, NOW);
    await addResume(kept.id, NOW);

    expect((await runTipEmails(context(), { sender: fakeSender() })).stats.users).toBe(0);

    const db = await getDb();
    await db
      .update(users)
      .set({ plan: "free", planStatus: "canceled", trialEndsAt: null })
      .where(eq(users.id, lapsed.id));
    await setPlan(kept, "pro");

    const tooSoon = await runTipEmails(context(endsAt + 12 * HOUR), { sender: fakeSender() });
    expect(tooSoon.stats.trial_ended).toBe(0);

    const sender = fakeSender();
    const dayAfter = await runTipEmails(context(endsAt + 20 * HOUR), { sender });
    expect(dayAfter.stats.trial_ended).toBe(1);
    expect(sender.messages.map((message) => message.to)).toEqual(["lapsed@example.com"]);
    expect(sender.messages[0]?.subject).toBe("Your Pro trial has ended");
    expect(sender.messages[0]?.text).toContain("ended on December 3");

    const later = await runTipEmails(context(endsAt + 44 * HOUR), { sender: fakeSender() });
    expect(later.stats.trial_ended).toBe(0);
  });

  it("sends one tip per account in a few days, whatever the kind", async () => {
    const fixer = await createUser("fixer@example.com", NOW - 20 * DAY);
    await usedFixes(fixer.id, "2026-11", 1);
    await (await getDb()).insert(emailLog).values({
      userId: fixer.id,
      kind: "no_resume",
      occasion: "once",
      createdAt: NOW - 2 * DAY,
    });

    expect((await runTipEmails(context(), { sender: fakeSender() })).stats.fixes_back).toBe(0);
    const later = await runTipEmails(context(NOW + 2 * DAY), { sender: fakeSender() });
    expect(later.stats.fixes_back).toBe(1);
  });

  it("keeps to the day's share of optional emails, and the next day picks up the rest", async () => {
    process.env.OPTIONAL_EMAILS_PER_DAY = "8";
    for (let i = 0; i < 7; i++) await createUser(`new-${i}@example.com`, NOW - 3 * DAY);
    const first = fakeSender();
    const outcome = await runTipEmails(context(), { sender: first });
    expect(outcome.complete).toBe(false);
    expect(first.messages).toHaveLength(4);

    const repeat = fakeSender();
    await runTipEmails(context(NOW + HOUR), { sender: repeat });
    expect(repeat.messages).toHaveLength(0);

    const nextDay = fakeSender();
    expect((await runTipEmails(context(NOW + DAY), { sender: nextDay })).complete).toBe(true);
    expect(nextDay.messages).toHaveLength(3);
    const everyone = new Set([...first.messages, ...nextDay.messages].map((message) => message.to));
    expect(everyone.size).toBe(7);
  });

  it("counts the weekly jobs emails sent today against the same allowance", async () => {
    process.env.OPTIONAL_EMAILS_PER_DAY = "4";
    const db = await getDb();
    for (let i = 0; i < 3; i++) {
      const reader = await createUser(`reader-${i}@example.com`, NOW - 90 * DAY);
      await saveEmailChoices(reader.id, { jobEmails: true }, NOW - 90 * DAY);
      await db
        .update(notificationSettings)
        .set({ jobsEmailedAt: NOW - HOUR })
        .where(eq(notificationSettings.userId, reader.id));
    }
    for (let i = 0; i < 3; i++) await createUser(`new-${i}@example.com`, NOW - 3 * DAY);
    const sender = fakeSender();
    await runTipEmails(context(), { sender });
    expect(sender.messages).toHaveLength(1);
  });

  it("keeps a copy of a trial's end only while tips are on", async () => {
    const on = await setPlan(await createUser("on@example.com"), "trial", NOW + DAY);
    const off = await setPlan(await createUser("off@example.com"), "trial", NOW + DAY);
    await saveEmailChoices(off.id, { tipEmails: false });
    await runTipEmails(context(), { sender: fakeSender() });
    const watched = await (await getDb()).select({ userId: trialWatch.userId }).from(trialWatch);
    expect(watched.map((row) => row.userId)).toEqual([on.id]);

    await saveEmailChoices(on.id, { tipEmails: false });
    await runTipEmails(context(NOW + HOUR), { sender: fakeSender() });
    expect(await (await getDb()).select().from(trialWatch)).toEqual([]);
  });

  it("logs nothing when email isn't set up, so the tips still go once it is", async () => {
    const newbie = await createUser("new@example.com", NOW - 3 * DAY);
    const outcome = await runTipEmails(context(), { sender: null });
    expect(outcome.stats).toMatchObject({ users: 0, emailOff: 1 });
    expect(await logOf(newbie.id)).toEqual([]);
  });
});
