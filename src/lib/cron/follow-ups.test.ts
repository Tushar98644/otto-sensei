import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { applications, notifications } from "@/db/schema";
import type { ApplicationStatus } from "@/lib/applications/status";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import type { EmailMessage, EmailSender } from "@/lib/notifications/email";
import { setEmailReminders } from "@/lib/notifications/records";
import { deleteUserData } from "@/lib/users";
import { runFollowUps } from "./follow-ups";

const DAY = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 8, 14, 0, 0);
const context = () => ({ now: NOW, deadline: Date.now() + 30_000 });

type Seed = {
  company: string;
  role?: string;
  appliedDaysAgo: number;
  // Days from NOW to the follow-up date; negative is past. Default: a week after applying.
  followUpInDays?: number | null;
  status?: ApplicationStatus;
  remindedAt?: number | null;
};

async function seed(userId: string, rows: Seed[]): Promise<string[]> {
  const db = await getDb();
  const ids: string[] = [];
  for (const row of rows) {
    const id = crypto.randomUUID();
    ids.push(id);
    const sent = NOW - row.appliedDaysAgo * DAY;
    const followUpAt =
      row.followUpInDays === null
        ? null
        : row.followUpInDays === undefined
          ? sent + 7 * DAY
          : NOW + row.followUpInDays * DAY;
    await db.insert(applications).values({
      id,
      userId,
      company: row.company,
      role: row.role ?? "",
      appliedAt: sent,
      status: row.status ?? "applied",
      statusChangedAt: sent,
      remindedAt: row.remindedAt ?? null,
      followUpAt,
      createdAt: sent,
      updatedAt: sent,
    });
  }
  return ids;
}

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

async function notificationsOf(userId: string) {
  return (await getDb()).select().from(notifications).where(eq(notifications.userId, userId));
}

describe("runFollowUps", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.CRON_SECRET = "test-cron-secret-0123456789";
    process.env.NEXT_PUBLIC_APP_URL = "https://otto.test";
    resetEnvForTests();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_APP_URL;
    resetEnvForTests();
  });

  it("reminds once per account about every follow-up that came due, and emails it", async () => {
    const maya = await createUser("maya@example.com");
    await setEmailReminders(maya.id, true);
    const [stripe] = await seed(maya.id, [
      { company: "Stripe", role: "Backend Engineer", appliedDaysAgo: 9 },
      { company: "Linear", appliedDaysAgo: 7 },
      // A week isn't up yet.
      { company: "Figma", appliedDaysAgo: 6 },
      // Moved on.
      { company: "Notion", appliedDaysAgo: 40, status: "interview" },
      // Already reminded about this date.
      { company: "Vercel", appliedDaysAgo: 20, remindedAt: NOW - 10 * DAY },
      // Done: no date.
      { company: "Canva", appliedDaysAgo: 30, followUpInDays: null },
      // Snoozed after an earlier reminder; the new date has come.
      { company: "Asana", appliedDaysAgo: 14, followUpInDays: -1, remindedAt: NOW - 4 * DAY },
    ]);
    const sender = fakeSender();

    const outcome = await runFollowUps(context(), { sender });

    expect(outcome).toEqual({
      stats: { users: 1, applications: 3, emailsSent: 1, emailsFailed: 0, emailsSkipped: 0 },
      complete: true,
      failed: [],
    });
    const [notice, ...others] = await notificationsOf(maya.id);
    expect(others).toHaveLength(0);
    expect(notice).toMatchObject({
      kind: "application_follow_up",
      title: "3 applications are ready for a follow-up",
      body: "Asana, Stripe and 1 more are ready for a follow-up. A short note can help.",
      link: "/dashboard/applications",
      readAt: null,
      createdAt: NOW,
    });

    const reminded = await (await getDb())
      .select({ company: applications.company, remindedAt: applications.remindedAt })
      .from(applications)
      .where(eq(applications.userId, maya.id));
    const stamped = Object.fromEntries(reminded.map((row) => [row.company, row.remindedAt]));
    expect(stamped).toEqual({
      Stripe: NOW,
      Linear: NOW,
      Figma: null,
      Notion: null,
      Vercel: NOW - 10 * DAY,
      Canva: null,
      Asana: NOW,
    });

    expect(sender.calls).toHaveLength(1);
    const [email] = sender.calls[0]!.messages;
    expect(email).toMatchObject({ to: "maya@example.com", subject: "3 applications are ready for a follow-up" });
    expect(email!.text).toContain("Stripe (Backend Engineer · applied 9 days ago)");
    expect(email!.text).toMatch(
      new RegExp(`Done: https://otto\\.test/reminder\\?do=done&u=${maya.id}&a=${stripe}&t=[\\w-]{43}`),
    );
    expect(email!.text).toContain("Snooze 3 days: https://otto.test/reminder?do=snooze");
    expect(email!.text).toContain("https://otto.test/dashboard/applications");
    expect(email!.text).toContain("https://otto.test/reminder?do=unsubscribe");
    expect(email!.text).toContain("https://otto.test/dashboard/account#reminders");
    expect(email!.headers?.["List-Unsubscribe"]).toMatch(
      new RegExp(`^<https://otto\\.test/api/notifications/unsubscribe\\?u=${maya.id}&t=[\\w-]{43}>$`),
    );
    expect(email!.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("does nothing more on a second run, even an overlapping one", async () => {
    const maya = await createUser("maya@example.com");
    await setEmailReminders(maya.id, true);
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 30 }]);
    const sender = fakeSender();

    const [first, second] = await Promise.all([
      runFollowUps(context(), { sender }),
      runFollowUps(context(), { sender }),
    ]);
    const third = await runFollowUps(context(), { sender });

    expect((first.stats.users ?? 0) + (second.stats.users ?? 0)).toBe(1);
    expect(third.stats.users).toBe(0);
    expect(await notificationsOf(maya.id)).toHaveLength(1);
    expect(sender.calls.flatMap((call) => call.messages)).toHaveLength(1);
  });

  it("emails only accounts that turned emails on, and keeps the rest in-app", async () => {
    const maya = await createUser("maya@example.com");
    const sam = await createUser("sam@example.com");
    const ana = await createUser("ana@example.com");
    // Maya turned them off after turning them on; Ana never chose, so she gets none.
    await setEmailReminders(maya.id, true);
    await setEmailReminders(maya.id, false);
    await setEmailReminders(sam.id, true);
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 10 }]);
    await seed(sam.id, [{ company: "Linear", appliedDaysAgo: 8 }]);
    await seed(ana.id, [{ company: "Figma", appliedDaysAgo: 8 }]);
    const sender = fakeSender();

    const outcome = await runFollowUps(context(), { sender });
    expect(outcome.stats).toMatchObject({ users: 3, emailsSent: 1, emailsSkipped: 2 });
    expect(sender.calls[0]!.messages.map((message) => message.to)).toEqual(["sam@example.com"]);
    expect(await notificationsOf(maya.id)).toHaveLength(1);
    expect(await notificationsOf(ana.id)).toHaveLength(1);

    const lee = await createUser("lee@example.com");
    await setEmailReminders(lee.id, true);
    await seed(lee.id, [{ company: "Figma", appliedDaysAgo: 8 }]);
    const noEmail = await runFollowUps(context(), { sender: null });
    expect(noEmail.stats).toMatchObject({ users: 1, emailsSent: 0, emailsSkipped: 1 });
    expect(await notificationsOf(lee.id)).toHaveLength(1);
  });

  it("names one company in the title and leaves accounts with nothing due alone", async () => {
    const maya = await createUser("maya@example.com");
    const quiet = await createUser("quiet@example.com");
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 7 }]);
    await seed(quiet.id, [{ company: "Figma", appliedDaysAgo: 3 }]);

    await runFollowUps(context(), { sender: null });

    const [notice] = await notificationsOf(maya.id);
    expect(notice?.title).toBe("Time to follow up with Stripe?");
    expect(notice?.body).toBe("It's been 7 days since you applied to Stripe. A short follow-up can help.");
    expect(await notificationsOf(quiet.id)).toHaveLength(0);
  });

  it("counts failed emails without failing the run or sending them again", async () => {
    const maya = await createUser("maya@example.com");
    await setEmailReminders(maya.id, true);
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 30 }]);
    const failing: EmailSender = { sendBatch: async (messages) => ({ sent: 0, failed: messages.length }) };

    const outcome = await runFollowUps(context(), { sender: failing });
    expect(outcome.failed).toEqual([]);
    expect(outcome.stats).toMatchObject({ users: 1, emailsSent: 0, emailsFailed: 1 });

    const sender = fakeSender();
    await runFollowUps(context(), { sender });
    expect(sender.calls).toHaveLength(0);
  });

  it("stops at its deadline and leaves the rest for the next run", async () => {
    const maya = await createUser("maya@example.com");
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 30 }]);

    const stopped = await runFollowUps({ now: NOW, deadline: 0 }, { sender: null });
    expect(stopped).toMatchObject({ complete: false, stats: { users: 0 } });

    const resumed = await runFollowUps(context(), { sender: null });
    expect(resumed).toMatchObject({ complete: true, stats: { users: 1 } });
  });

  it("finds nothing for a deleted account", async () => {
    const maya = await createUser("maya@example.com");
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 30 }]);
    await deleteUserData(maya.id);

    const outcome = await runFollowUps(context(), { sender: null });
    expect(outcome.stats.users).toBe(0);
    expect(await (await getDb()).select().from(notifications)).toHaveLength(0);
  });
});
