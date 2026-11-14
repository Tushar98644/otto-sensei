import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { notifications, trialReminders, users, workProfiles } from "@/db/schema";
import { execSql } from "@/db/testing";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import type { EmailMessage, EmailSender } from "@/lib/notifications/email";
import { setEmailReminders } from "@/lib/notifications/records";
import { deleteUserData } from "@/lib/users";
import { runTrialReminders } from "./trial-reminders";

const MINUTE = 60 * 1_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
// Monday, 13:00 UTC: the trial ending 25 hours later ends on Tuesday, November 17 at 14:00 UTC.
const NOW = Date.UTC(2026, 10, 16, 13, 0, 0);
const context = (now = NOW) => ({ now, deadline: Date.now() + 30_000 });

function fakeSender(): EmailSender & { calls: { messages: EmailMessage[]; key: string }[] } {
  const calls: { messages: EmailMessage[]; key: string }[] = [];
  return {
    calls,
    async sendBatch(messages, key) {
      calls.push({ messages, key });
      return { sent: messages.length, failed: 0 };
    },
  };
}

async function trialist(email: string, endsAt: number, planStatus = "trialing") {
  const user = await setPlan(await createUser(email), "trial", endsAt);
  if (planStatus !== "trialing") {
    await (await getDb()).update(users).set({ planStatus }).where(eq(users.id, user.id));
  }
  return user;
}

async function noticesOf(userId: string) {
  return (await getDb()).select().from(notifications).where(eq(notifications.userId, userId));
}

async function remindersOf(userId: string) {
  return (await getDb()).select().from(trialReminders).where(eq(trialReminders.userId, userId));
}

describe("runTrialReminders", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.NEXT_PUBLIC_APP_URL = "https://otto.test";
    resetEnvForTests();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    resetEnvForTests();
  });

  it("reminds trials ending up to 36 hours after the run's hour, and no one else", async () => {
    const tooSoon = await trialist("soon@example.com", NOW + 29 * MINUTE + HOUR);
    const first = await trialist("first@example.com", NOW + 29 * MINUTE + HOUR + 1);
    const last = await trialist("last@example.com", NOW + 36 * HOUR);
    const tooLate = await trialist("late@example.com", NOW + 36 * HOUR + 1);
    const mock = await trialist("mock@example.com", NOW + 24 * HOUR, "mock_trialing");
    const cancelling = await trialist("cancel@example.com", NOW + 24 * HOUR, "scheduled_cancel");
    const pastDue = await trialist("due@example.com", NOW + 24 * HOUR, "past_due");
    const paying = await setPlan(await createUser("paid@example.com"), "pro");
    const free = await createUser("free@example.com");
    await (
      await getDb()
    )
      .update(users)
      .set({ trialEndsAt: NOW + 24 * HOUR, planStatus: "trialing" })
      .where(eq(users.id, free.id));
    const sender = fakeSender();

    // Started 29 minutes late: the same window as a run on the hour.
    const outcome = await runTrialReminders(context(NOW + 29 * MINUTE), { sender });

    expect(outcome).toEqual({
      stats: { users: 3, emailsSent: 3, emailsFailed: 0, emailsSkipped: 0 },
      complete: true,
      failed: [],
    });
    for (const user of [first, last, mock]) expect(await noticesOf(user.id)).toHaveLength(1);
    for (const user of [tooSoon, tooLate, cancelling, pastDue, paying, free]) {
      expect(await noticesOf(user.id)).toHaveLength(0);
    }
    expect(sender.calls[0]!.messages.map((message) => message.to).sort()).toEqual([
      "first@example.com",
      "last@example.com",
      "mock@example.com",
    ]);

    const nextDay = await runTrialReminders(context(NOW + DAY), { sender: fakeSender() });
    expect(nextDay.stats.users).toBe(1);
    expect(await noticesOf(tooLate.id)).toHaveLength(1);
  });

  it("leaves no gap and no overlap between one day's run and the next", async () => {
    const reachedYesterday = await trialist("ana@example.com", NOW + 12 * HOUR);
    const reachedToday = await trialist("ben@example.com", NOW + 12 * HOUR + 1);

    const yesterday = await runTrialReminders(context(NOW - DAY + 59 * MINUTE), { sender: null });
    const today = await runTrialReminders(context(NOW), { sender: null });

    expect(yesterday.stats.users).toBe(1);
    expect(today.stats.users).toBe(1);
    expect(await remindersOf(reachedYesterday.id)).toEqual([
      {
        userId: reachedYesterday.id,
        trialEndsAt: NOW + 12 * HOUR,
        createdAt: NOW - DAY + 59 * MINUTE,
      },
    ]);
    expect(await remindersOf(reachedToday.id)).toEqual([
      { userId: reachedToday.id, trialEndsAt: NOW + 12 * HOUR + 1, createdAt: NOW },
    ]);
  });

  it("reminds a trial a missed run left behind, late, while at least an hour is left", async () => {
    const ended = await trialist("ended@example.com", NOW - MINUTE);
    const tooLate = await trialist("hour@example.com", NOW + HOUR);
    const stillTime = await trialist("time@example.com", NOW + HOUR + 1);
    const sender = fakeSender();

    const outcome = await runTrialReminders(context(), { sender });

    expect(outcome.stats).toMatchObject({ users: 1, emailsSent: 1 });
    expect(await noticesOf(stillTime.id)).toHaveLength(1);
    for (const user of [ended, tooLate]) expect(await noticesOf(user.id)).toHaveLength(0);
    expect(sender.calls[0]!.messages[0]!.text).toContain("Monday, November 16 at 14:00 UTC");
  });

  it("sends exactly once, across runs and overlapping ones", async () => {
    const maya = await trialist("maya@example.com", NOW + 25 * HOUR);
    const sender = fakeSender();

    const [a, b] = await Promise.all([
      runTrialReminders(context(), { sender }),
      runTrialReminders(context(), { sender }),
    ]);
    const again = await runTrialReminders(context(NOW + 3 * HOUR), { sender });

    expect((a.stats.users ?? 0) + (b.stats.users ?? 0)).toBe(1);
    expect(again.stats.users).toBe(0);
    expect(await noticesOf(maya.id)).toHaveLength(1);
    expect(await remindersOf(maya.id)).toEqual([
      { userId: maya.id, trialEndsAt: NOW + 25 * HOUR, createdAt: NOW },
    ]);
    expect(sender.calls.flatMap((call) => call.messages)).toHaveLength(1);
    expect(sender.calls[0]!.key).toMatch(/^trial-ending-[0-9a-f]{40}$/);
  });

  it("doesn't remind a trial again when its end moves, but does remind a new trial", async () => {
    const maya = await trialist("maya@example.com", NOW + 25 * HOUR);
    await runTrialReminders(context(), { sender: null });
    const db = await getDb();

    await db
      .update(users)
      .set({ trialEndsAt: NOW + 31 * HOUR })
      .where(eq(users.id, maya.id));
    expect((await runTrialReminders(context(NOW + HOUR), { sender: null })).stats.users).toBe(0);
    expect(await noticesOf(maya.id)).toHaveLength(1);

    const later = NOW + 30 * DAY;
    await db
      .update(users)
      .set({ trialEndsAt: later + 25 * HOUR })
      .where(eq(users.id, maya.id));
    expect((await runTrialReminders(context(later), { sender: null })).stats.users).toBe(1);
    expect(await noticesOf(maya.id)).toHaveLength(2);
    expect(await remindersOf(maya.id)).toHaveLength(2);
  });

  it("puts it in the bell only when email isn't set up", async () => {
    const maya = await trialist("maya@example.com", NOW + 25 * HOUR);

    const outcome = await runTrialReminders(context(), { sender: null });

    expect(outcome.stats).toEqual({ users: 1, emailsSent: 0, emailsFailed: 0, emailsSkipped: 1 });
    const [notice, ...others] = await noticesOf(maya.id);
    expect(others).toHaveLength(0);
    expect(notice).toMatchObject({
      kind: "trial_ending",
      title: "Your Pro trial ends on November 17",
      body: "It ends on Tuesday, November 17 at 14:00 UTC. After that, Pro costs $15/month. You can cancel anytime before then from your account page.",
      link: "/dashboard/account",
      readAt: null,
      createdAt: NOW,
    });
  });

  it("emails every trialist, reminder emails on or off, with the end, the price and the account link", async () => {
    const maya = await trialist("maya@example.com", NOW + 25 * HOUR);
    const sam = await trialist("sam@example.com", NOW + 25 * HOUR);
    await setEmailReminders(maya.id, false);
    await setEmailReminders(sam.id, true);
    const sender = fakeSender();

    const outcome = await runTrialReminders(context(), { sender });

    expect(outcome.stats).toMatchObject({ users: 2, emailsSent: 2, emailsSkipped: 0 });
    const email = sender.calls[0]!.messages.find((message) => message.to === "maya@example.com");
    expect(email).toMatchObject({
      subject: "Your Pro trial ends on November 17",
      tags: [{ name: "kind", value: "trial_ending" }],
    });
    expect(email!.headers).toBeUndefined();
    for (const body of [email!.text, email!.html]) {
      expect(body).toContain("Tuesday, November 17 at 14:00 UTC");
      expect(body).toContain("Pro costs $15/month");
      expect(body).toContain("https://otto.test/account");
      expect(body).toContain("cancel anytime before then");
    }
    expect(email!.html).toContain('src="https://otto.test/email/otto-head.png"');
  });

  it("gives the end in the work profile's time zone when there is one", async () => {
    const maya = await trialist("maya@example.com", NOW + 25 * HOUR);
    await (
      await getDb()
    )
      .insert(workProfiles)
      .values({ userId: maya.id, timeZone: "Asia/Kolkata", createdAt: NOW, updatedAt: NOW });
    const sender = fakeSender();

    await runTrialReminders(context(), { sender });

    const [notice] = await noticesOf(maya.id);
    expect(notice?.body).toContain("Tuesday, November 17 at 19:30 GMT+5:30");
    expect(sender.calls[0]!.messages[0]!.text).toContain("Tuesday, November 17 at 19:30 GMT+5:30");
  });

  it("counts failed emails without failing the run or sending them again", async () => {
    await trialist("maya@example.com", NOW + 25 * HOUR);
    const failing: EmailSender = {
      sendBatch: async (messages) => ({ sent: 0, failed: messages.length }),
    };

    const outcome = await runTrialReminders(context(), { sender: failing });
    expect(outcome.failed).toEqual([]);
    expect(outcome.stats).toMatchObject({ users: 1, emailsSent: 0, emailsFailed: 1 });

    const sender = fakeSender();
    await runTrialReminders(context(), { sender });
    expect(sender.calls).toHaveLength(0);
  });

  it("stops at its deadline, and the next day's run reminds the trials that haven't ended", async () => {
    const maya = await trialist("maya@example.com", NOW + 30 * HOUR);

    const stopped = await runTrialReminders({ now: NOW, deadline: 0 }, { sender: null });
    expect(stopped).toMatchObject({ complete: false, stats: { users: 0 } });

    const resumed = await runTrialReminders(context(NOW + DAY), { sender: null });
    expect(resumed).toMatchObject({ complete: true, stats: { users: 1 } });
    expect(await remindersOf(maya.id)).toHaveLength(1);
  });

  it("logs only the id when a claim fails, and the next day's run still reminds that trial", async () => {
    const maya = await trialist("maya@example.com", NOW + 30 * HOUR);
    const sam = await trialist("sam@example.com", NOW + 30 * HOUR);
    await execSql(
      `create function fail_one() returns trigger language plpgsql as $$ begin if new.user_id = '${maya.id}' then raise exception 'boom'; end if; return new; end $$`,
    );
    await execSql(
      "create trigger fail_one before insert on public.notifications for each row execute function fail_one()",
    );
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const outcome = await runTrialReminders(context(), { sender: null });
      expect(outcome).toMatchObject({ failed: ["claim"], stats: { users: 1 } });
    } finally {
      await execSql("drop trigger fail_one on public.notifications");
      await execSql("drop function fail_one()");
    }
    const logged = JSON.stringify(errors.mock.calls);
    errors.mockRestore();
    expect(logged).toContain(maya.id);
    expect(logged).not.toContain("@example.com");
    expect(await remindersOf(maya.id)).toHaveLength(0);
    expect(await remindersOf(sam.id)).toHaveLength(1);

    const nextDay = await runTrialReminders(context(NOW + DAY), { sender: null });
    expect(nextDay).toMatchObject({ failed: [], stats: { users: 1 } });
    expect(await noticesOf(maya.id)).toHaveLength(1);
    expect(await noticesOf(sam.id)).toHaveLength(1);
  });

  it("finds nothing for a deleted account, and its reminders go with it", async () => {
    const maya = await trialist("maya@example.com", NOW + 25 * HOUR);
    const ana = await trialist("ana@example.com", NOW + 25 * HOUR);
    await runTrialReminders(context(), { sender: null });
    await deleteUserData(maya.id);
    expect(await remindersOf(maya.id)).toHaveLength(0);
    expect(await remindersOf(ana.id)).toHaveLength(1);

    await deleteUserData(ana.id);
    const outcome = await runTrialReminders(context(), { sender: null });
    expect(outcome.stats.users).toBe(0);
    expect(await (await getDb()).select().from(trialReminders)).toHaveLength(0);
  });
});
