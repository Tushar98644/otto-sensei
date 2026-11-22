import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { applications, notifications, workProfiles } from "@/db/schema";
import type { ApplicationStatus } from "@/lib/applications/status";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import type { EmailMessage, EmailSender } from "@/lib/notifications/email";
import { setEmailReminders } from "@/lib/notifications/records";
import { deleteUserData } from "@/lib/users";
import { applyFollowUpAction } from "@/app/api/applications/records";
import { runFollowUps } from "./follow-ups";

const HOUR = 60 * 60 * 1_000;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 10, 8, 14, 0, 0);
const context = () => ({ now: NOW, deadline: Date.now() + 30_000 });

type Seed = {
  company: string;
  role?: string;
  appliedDaysAgo: number;
  followUpInDays?: number | null;
  status?: ApplicationStatus;
  remindedAt?: number | null;
  interviewAt?: number | null;
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
      interviewAt: row.interviewAt ?? null,
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

async function proUser(email: string) {
  return setPlan(await createUser(email), "pro");
}

async function notificationsOf(userId: string) {
  const rows = await (
    await getDb()
  )
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId));
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

async function interview(userId: string, company: string, interviewAt: number): Promise<string> {
  const [id] = await seed(userId, [
    {
      company,
      role: "Backend Engineer",
      appliedDaysAgo: 20,
      status: "interview",
      interviewAt,
      followUpInDays: null,
    },
  ]);
  return id!;
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

  it("gives each follow-up that came due its own bell row, and emails them together", async () => {
    const maya = await proUser("maya@example.com");
    await setEmailReminders(maya.id, true);
    const [stripe] = await seed(maya.id, [
      { company: "Stripe", role: "Backend Engineer", appliedDaysAgo: 9 },
      { company: "Linear", appliedDaysAgo: 7 },
      { company: "Figma", appliedDaysAgo: 6 },
      { company: "Notion", appliedDaysAgo: 40, status: "interview", followUpInDays: null },
      { company: "Vercel", appliedDaysAgo: 20, remindedAt: NOW - 10 * DAY },
      { company: "Canva", appliedDaysAgo: 30, followUpInDays: null },
      { company: "Asana", appliedDaysAgo: 14, followUpInDays: -1, remindedAt: NOW - 4 * DAY },
    ]);
    const sender = fakeSender();

    const outcome = await runFollowUps(context(), { sender });

    expect(outcome).toEqual({
      stats: {
        users: 1,
        applications: 3,
        interviews: 0,
        emailsSent: 1,
        emailsFailed: 0,
        emailsSkipped: 0,
      },
      complete: true,
      failed: [],
    });
    const rows = await notificationsOf(maya.id);
    expect(rows.map((row) => row.title)).toEqual([
      "Time to follow up with Asana?",
      "Time to follow up with Stripe?",
      "Time to follow up with Linear?",
    ]);
    expect(rows[1]).toMatchObject({
      kind: "application_follow_up",
      body: "It's been 9 days since you applied to Stripe. A short follow-up can help.",
      link: `/dashboard/applications/${stripe}`,
      applicationId: stripe,
      readAt: null,
      createdAt: NOW - 1,
    });

    const reminded = await (
      await getDb()
    )
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
    expect(email).toMatchObject({
      to: "maya@example.com",
      subject: "3 applications are ready for a follow-up",
    });
    expect(email!.text).toContain("Stripe (Backend Engineer · applied 9 days ago)");
    expect(email!.text).toMatch(
      new RegExp(
        `Done: https://otto\\.test/reminder\\?do=done&u=${maya.id}&a=${stripe}&t=[\\w-]{43}`,
      ),
    );
    expect(email!.text).toContain("Snooze 3 days: https://otto.test/reminder?do=snooze");
    expect(email!.text).toContain(
      `Write it for me: https://otto.test/dashboard/applications/${stripe}?write=follow-up&utm_source=otto&utm_medium=email&utm_campaign=follow_up&utm_content=write`,
    );
    expect(email!.text).toContain(
      "https://otto.test/dashboard/applications?utm_source=otto&utm_medium=email&utm_campaign=follow_up&utm_content=applications",
    );
    expect(email!.text).toContain("https://otto.test/reminder?do=unsubscribe");
    expect(email!.text).toContain(
      "https://otto.test/dashboard/account?utm_source=otto&utm_medium=email&utm_campaign=follow_up&utm_content=settings#reminders",
    );
    expect(email!.headers?.["List-Unsubscribe"]).toMatch(
      new RegExp(
        `^<https://otto\\.test/api/notifications/unsubscribe\\?u=${maya.id}&t=[\\w-]{43}>$`,
      ),
    );
    expect(email!.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("follows up after an interview too, saying so, and snoozes it like any other", async () => {
    const maya = await proUser("maya@example.com");
    await setEmailReminders(maya.id, true);
    const [figma] = await seed(maya.id, [
      {
        company: "Figma",
        role: "Designer",
        appliedDaysAgo: 30,
        status: "interview",
        interviewAt: NOW - 8 * DAY,
        followUpInDays: -1,
      },
    ]);
    const sender = fakeSender();

    await runFollowUps(context(), { sender });

    const [row] = await notificationsOf(maya.id);
    expect(row).toMatchObject({
      kind: "application_follow_up",
      title: "Time to follow up with Figma?",
      body: "It's been 8 days since your interview with Figma. A short note keeps you in mind.",
      applicationId: figma,
    });
    expect(sender.calls[0]!.messages[0]!.text).toContain(
      "Figma (Designer · interviewed 8 days ago)",
    );
    const snoozed = await applyFollowUpAction(maya.id, figma!, "snooze", NOW);
    expect(snoozed?.followUpAt).toBe(NOW + 3 * DAY);
  });

  it("does nothing more on a second run, even an overlapping one", async () => {
    const maya = await proUser("maya@example.com");
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
    const maya = await proUser("maya@example.com");
    const sam = await proUser("sam@example.com");
    const ana = await proUser("ana@example.com");
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

    const lee = await proUser("lee@example.com");
    await setEmailReminders(lee.id, true);
    await seed(lee.id, [{ company: "Figma", appliedDaysAgo: 8 }]);
    const noEmail = await runFollowUps(context(), { sender: null });
    expect(noEmail.stats).toMatchObject({ users: 1, emailsSent: 0, emailsSkipped: 1 });
    expect(await notificationsOf(lee.id)).toHaveLength(1);
  });

  it("names one company in the title and leaves accounts with nothing due alone", async () => {
    const maya = await proUser("maya@example.com");
    const quiet = await proUser("quiet@example.com");
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 7 }]);
    await seed(quiet.id, [{ company: "Figma", appliedDaysAgo: 3 }]);

    await runFollowUps(context(), { sender: null });

    const [notice] = await notificationsOf(maya.id);
    expect(notice?.title).toBe("Time to follow up with Stripe?");
    expect(notice?.body).toBe(
      "It's been 7 days since you applied to Stripe. A short follow-up can help.",
    );
    expect(await notificationsOf(quiet.id)).toHaveLength(0);
  });

  it("counts failed emails without failing the run or sending them again", async () => {
    const maya = await proUser("maya@example.com");
    await setEmailReminders(maya.id, true);
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 30 }]);
    const failing: EmailSender = {
      sendBatch: async (messages) => ({ sent: 0, failed: messages.length }),
    };

    const outcome = await runFollowUps(context(), { sender: failing });
    expect(outcome.failed).toEqual([]);
    expect(outcome.stats).toMatchObject({ users: 1, emailsSent: 0, emailsFailed: 1 });

    const sender = fakeSender();
    await runFollowUps(context(), { sender });
    expect(sender.calls).toHaveLength(0);
  });

  it("stops at its deadline and leaves the rest for the next run", async () => {
    const maya = await proUser("maya@example.com");
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 30 }]);

    const stopped = await runFollowUps({ now: NOW, deadline: 0 }, { sender: null });
    expect(stopped).toMatchObject({ complete: false, stats: { users: 0 } });

    const resumed = await runFollowUps(context(), { sender: null });
    expect(resumed).toMatchObject({ complete: true, stats: { users: 1 } });
  });

  it("reminds Free accounts about their tracked application too", async () => {
    const free = await createUser("free@example.com");
    await setEmailReminders(free.id, true);
    await seed(free.id, [{ company: "Stripe", appliedDaysAgo: 30 }]);
    const sender = fakeSender();

    expect((await runFollowUps(context(), { sender })).stats).toMatchObject({
      users: 1,
      applications: 1,
    });
    expect(await notificationsOf(free.id)).toHaveLength(1);
    expect(sender.calls).toHaveLength(1);
    // The writer is a Pro tool, and a reminder never sells.
    expect(sender.calls[0]!.messages[0]!.text).not.toContain("Write it for me");
  });

  it("folds more than three follow-ups into one bell row", async () => {
    const maya = await proUser("maya@example.com");
    await seed(maya.id, [
      { company: "Stripe", appliedDaysAgo: 9 },
      { company: "Linear", appliedDaysAgo: 8 },
      { company: "Figma", appliedDaysAgo: 10 },
      { company: "Notion", appliedDaysAgo: 11 },
    ]);

    await runFollowUps(context(), { sender: null });

    const rows = await notificationsOf(maya.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "4 applications are ready for a follow-up",
      link: "/dashboard/applications",
      applicationId: null,
    });
  });

  it("finds nothing for a deleted account", async () => {
    const maya = await proUser("maya@example.com");
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 30 }]);
    await deleteUserData(maya.id);

    const outcome = await runFollowUps(context(), { sender: null });
    expect(outcome.stats.users).toBe(0);
    expect(await (await getDb()).select().from(notifications)).toHaveLength(0);
  });

  it("reminds the day before an interview, once, in the bell and the reminder email", async () => {
    const maya = await proUser("maya@example.com");
    await setEmailReminders(maya.id, true);
    const tomorrow = Date.UTC(2026, 10, 9, 12);
    const stripe = await interview(maya.id, "Stripe", tomorrow);
    await interview(maya.id, "Later", Date.UTC(2026, 10, 10, 12));
    await interview(maya.id, "Past", NOW - HOUR);
    await seed(maya.id, [
      { company: "Applied", appliedDaysAgo: 2, followUpInDays: 3, interviewAt: tomorrow },
      { company: "Offer", appliedDaysAgo: 30, status: "offer", interviewAt: tomorrow },
    ]);
    const sender = fakeSender();

    const outcome = await runFollowUps(context(), { sender });

    expect(outcome.stats).toMatchObject({
      users: 1,
      applications: 0,
      interviews: 1,
      emailsSent: 1,
    });
    const rows = await notificationsOf(maya.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: "interview_soon",
      title: "Your interview with Stripe is tomorrow",
      body: "For the Backend Engineer role. Go over the likely questions in your prep before you go.",
      link: `/dashboard/applications/${stripe}/prep?start=1`,
      applicationId: stripe,
    });
    const [email] = sender.calls[0]!.messages;
    expect(email).toMatchObject({
      to: "maya@example.com",
      subject: "Your interview with Stripe is tomorrow",
      tags: [{ name: "kind", value: "interview_soon" }],
    });
    expect(email!.text).toContain(
      `Open your prep: https://otto.test/dashboard/applications/${stripe}/prep?start=1`,
    );

    expect((await runFollowUps(context(), { sender })).stats.users).toBe(0);
    expect(sender.calls).toHaveLength(1);
  });

  it("reminds again when the interview moves, and keeps it in the bell when emails are off", async () => {
    const maya = await proUser("maya@example.com");
    const stripe = await interview(maya.id, "Stripe", Date.UTC(2026, 10, 9, 12));
    const sender = fakeSender();
    await runFollowUps(context(), { sender });

    await (
      await getDb()
    )
      .update(applications)
      .set({ interviewAt: Date.UTC(2026, 10, 9, 16) })
      .where(eq(applications.id, stripe));
    const moved = await runFollowUps(context(), { sender });

    expect(moved.stats).toMatchObject({ users: 1, interviews: 1, emailsSkipped: 1 });
    expect(await notificationsOf(maya.id)).toHaveLength(2);
    expect(sender.calls).toHaveLength(0);
  });

  it("says the day in the account's own time zone", async () => {
    const maya = await proUser("maya@example.com");
    await (await getDb()).insert(workProfiles).values({
      userId: maya.id,
      timeZone: "America/Los_Angeles",
      createdAt: NOW,
      updatedAt: NOW,
    });
    await interview(maya.id, "Stripe", Date.UTC(2026, 10, 9, 1));

    await runFollowUps(context(), { sender: null });

    const [row] = await notificationsOf(maya.id);
    expect(row?.title).toBe("Your interview with Stripe is today");
  });

  it("sends one email with the interview first and the follow-up after it", async () => {
    const maya = await proUser("maya@example.com");
    await setEmailReminders(maya.id, true);
    const figma = await interview(maya.id, "Figma", Date.UTC(2026, 10, 9, 12));
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 9 }]);
    const sender = fakeSender();

    const outcome = await runFollowUps(context(), { sender });

    expect(outcome.stats).toMatchObject({
      users: 1,
      applications: 1,
      interviews: 1,
      emailsSent: 1,
    });
    expect((await notificationsOf(maya.id)).map((row) => row.kind)).toEqual([
      "interview_soon",
      "application_follow_up",
    ]);
    expect(sender.calls[0]!.messages).toHaveLength(1);
    const [email] = sender.calls[0]!.messages;
    expect(email!.subject).toBe("Your interview with Figma is tomorrow");
    expect(email!.text.indexOf("Figma")).toBeLessThan(email!.text.indexOf("Stripe"));
    expect(email!.text).toContain(`/dashboard/applications/${figma}/prep?start=1`);
    expect(email!.text).toContain(
      "Open your applications: https://otto.test/dashboard/applications",
    );
  });
});
