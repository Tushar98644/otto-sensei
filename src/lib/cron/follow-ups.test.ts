import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { applications, notifications, workProfiles } from "@/db/schema";
import type { ApplicationStatus } from "@/lib/applications/status";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
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

  it("gives each follow-up that came due its own bell row", async () => {
    const maya = await proUser("maya@example.com");
    const [stripe] = await seed(maya.id, [
      { company: "Stripe", role: "Backend Engineer", appliedDaysAgo: 9 },
      { company: "Linear", appliedDaysAgo: 7 },
      { company: "Figma", appliedDaysAgo: 6 },
      { company: "Notion", appliedDaysAgo: 40, status: "interview", followUpInDays: null },
      { company: "Vercel", appliedDaysAgo: 20, remindedAt: NOW - 10 * DAY },
      { company: "Canva", appliedDaysAgo: 30, followUpInDays: null },
      { company: "Asana", appliedDaysAgo: 14, followUpInDays: -1, remindedAt: NOW - 4 * DAY },
    ]);

    const outcome = await runFollowUps(context());

    expect(outcome).toEqual({
      stats: { users: 1, applications: 3, interviews: 0 },
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
  });

  it("follows up after an interview too, saying so, and snoozes it like any other", async () => {
    const maya = await proUser("maya@example.com");
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

    await runFollowUps(context());

    const [row] = await notificationsOf(maya.id);
    expect(row).toMatchObject({
      kind: "application_follow_up",
      title: "Time to follow up with Figma?",
      body: "It's been 8 days since your interview with Figma. A short note keeps you in mind.",
      applicationId: figma,
    });
    const snoozed = await applyFollowUpAction(maya.id, figma!, "snooze", NOW);
    expect(snoozed?.followUpAt).toBe(NOW + 3 * DAY);
  });

  it("does nothing more on a second run, even an overlapping one", async () => {
    const maya = await proUser("maya@example.com");
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 30 }]);

    const [first, second] = await Promise.all([runFollowUps(context()), runFollowUps(context())]);
    const third = await runFollowUps(context());

    expect((first.stats.users ?? 0) + (second.stats.users ?? 0)).toBe(1);
    expect(third.stats.users).toBe(0);
    expect(await notificationsOf(maya.id)).toHaveLength(1);
  });

  it("sends no email, even to an account that once turned reminder emails on", async () => {
    const sam = await proUser("sam@example.com");
    await setEmailReminders(sam.id, true);
    await seed(sam.id, [{ company: "Linear", appliedDaysAgo: 8 }]);

    const outcome = await runFollowUps(context());
    expect(outcome.stats).toEqual({ users: 1, applications: 1, interviews: 0 });
    expect(await notificationsOf(sam.id)).toHaveLength(1);
  });

  it("names one company in the title and leaves accounts with nothing due alone", async () => {
    const maya = await proUser("maya@example.com");
    const quiet = await proUser("quiet@example.com");
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 7 }]);
    await seed(quiet.id, [{ company: "Figma", appliedDaysAgo: 3 }]);

    await runFollowUps(context());

    const [notice] = await notificationsOf(maya.id);
    expect(notice?.title).toBe("Time to follow up with Stripe?");
    expect(notice?.body).toBe(
      "It's been 7 days since you applied to Stripe. A short follow-up can help.",
    );
    expect(await notificationsOf(quiet.id)).toHaveLength(0);
  });

  it("stops at its deadline and leaves the rest for the next run", async () => {
    const maya = await proUser("maya@example.com");
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 30 }]);

    const stopped = await runFollowUps({ now: NOW, deadline: 0 });
    expect(stopped).toMatchObject({ complete: false, stats: { users: 0 } });

    const resumed = await runFollowUps(context());
    expect(resumed).toMatchObject({ complete: true, stats: { users: 1 } });
  });

  it("reminds Free accounts about their tracked application too", async () => {
    const free = await createUser("free@example.com");
    await seed(free.id, [{ company: "Stripe", appliedDaysAgo: 30 }]);

    expect((await runFollowUps(context())).stats).toMatchObject({
      users: 1,
      applications: 1,
    });
    expect(await notificationsOf(free.id)).toHaveLength(1);
  });

  it("folds more than three follow-ups into one bell row", async () => {
    const maya = await proUser("maya@example.com");
    await seed(maya.id, [
      { company: "Stripe", appliedDaysAgo: 9 },
      { company: "Linear", appliedDaysAgo: 8 },
      { company: "Figma", appliedDaysAgo: 10 },
      { company: "Notion", appliedDaysAgo: 11 },
    ]);

    await runFollowUps(context());

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

    const outcome = await runFollowUps(context());
    expect(outcome.stats.users).toBe(0);
    expect(await (await getDb()).select().from(notifications)).toHaveLength(0);
  });

  it("reminds the day before an interview, once, in the bell", async () => {
    const maya = await proUser("maya@example.com");
    const tomorrow = Date.UTC(2026, 10, 9, 12);
    const stripe = await interview(maya.id, "Stripe", tomorrow);
    await interview(maya.id, "Later", Date.UTC(2026, 10, 10, 12));
    await interview(maya.id, "Past", NOW - HOUR);
    await seed(maya.id, [
      { company: "Applied", appliedDaysAgo: 2, followUpInDays: 3, interviewAt: tomorrow },
      { company: "Offer", appliedDaysAgo: 30, status: "offer", interviewAt: tomorrow },
    ]);

    const outcome = await runFollowUps(context());

    expect(outcome.stats).toMatchObject({ users: 1, applications: 0, interviews: 1 });
    const rows = await notificationsOf(maya.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: "interview_soon",
      title: "Your interview with Stripe is tomorrow",
      body: "For the Backend Engineer role. Go over the likely questions in your prep before you go.",
      link: `/dashboard/applications/${stripe}/prep?start=1`,
      applicationId: stripe,
    });

    expect((await runFollowUps(context())).stats.users).toBe(0);
  });

  it("reminds again when the interview moves", async () => {
    const maya = await proUser("maya@example.com");
    const stripe = await interview(maya.id, "Stripe", Date.UTC(2026, 10, 9, 12));
    await runFollowUps(context());

    await (
      await getDb()
    )
      .update(applications)
      .set({ interviewAt: Date.UTC(2026, 10, 9, 16) })
      .where(eq(applications.id, stripe));
    const moved = await runFollowUps(context());

    expect(moved.stats).toMatchObject({ users: 1, interviews: 1 });
    expect(await notificationsOf(maya.id)).toHaveLength(2);
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

    await runFollowUps(context());

    const [row] = await notificationsOf(maya.id);
    expect(row?.title).toBe("Your interview with Stripe is today");
  });

  it("lists the interview first and the follow-up after it", async () => {
    const maya = await proUser("maya@example.com");
    await interview(maya.id, "Figma", Date.UTC(2026, 10, 9, 12));
    await seed(maya.id, [{ company: "Stripe", appliedDaysAgo: 9 }]);

    const outcome = await runFollowUps(context());

    expect(outcome.stats).toMatchObject({ users: 1, applications: 1, interviews: 1 });
    expect((await notificationsOf(maya.id)).map((row) => row.kind)).toEqual([
      "interview_soon",
      "application_follow_up",
    ]);
  });
});
