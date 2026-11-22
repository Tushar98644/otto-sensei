import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  applications,
  jobs,
  notifications,
  notificationSettings,
  resumes,
  savedJobs,
} from "@/db/schema";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import type { RawJob } from "@/lib/job-feed/parsers";
import { saveJobs, syncBoards } from "@/lib/job-feed/store";
import { emptyResume, newBullet, newId, type Resume } from "@/lib/resume/schema";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import { matchesNotice, runWeeklyMatches, WEEKLY_JOBS } from "./weekly-jobs";

const context = (now = Date.now()) => ({ now, deadline: Date.now() + 30_000 });

const jobUrl = (id: string) => `https://job-boards.greenhouse.io/acme/jobs/${id}`;

async function jobIdOf(id: string): Promise<string> {
  const [row] = await (
    await getDb()
  )
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.url, jobUrl(id)));
  return row!.id;
}

async function firstSeen(id: string, at: number) {
  await (
    await getDb()
  )
    .update(jobs)
    .set({ firstSeenAt: at })
    .where(eq(jobs.url, jobUrl(id)));
}

function raw(id: string, overrides: Partial<RawJob> = {}): RawJob {
  return {
    externalId: id,
    company: `Company ${id}`,
    title: "Backend Engineer",
    location: "Remote - Germany",
    remote: true,
    employmentType: "full_time",
    postedAt: Date.now() - DAY_MS,
    validThrough: null,
    url: jobUrl(id),
    text: "Build services in TypeScript, Node.js and PostgreSQL on Kubernetes.",
    ...overrides,
  };
}

async function seedJobs(list: RawJob[]) {
  const db = await getDb();
  await syncBoards(db, [{ ats: "greenhouse", token: "acme", company: "Acme" }], Date.now());
  await saveJobs(db, { source: "greenhouse", board: "acme" }, list, Date.now(), { snapshot: true });
}

function engineerResume(): Resume {
  return {
    ...emptyResume(Date.now()),
    experience: [
      {
        id: newId(),
        company: "Northwind",
        title: "Software Engineer",
        location: "",
        startDate: "Jan 2021",
        endDate: "Present",
        bullets: [newBullet("Built services in TypeScript and Node.js on PostgreSQL.")],
      },
    ],
    skills: [
      {
        id: newId(),
        label: "Skills",
        items: ["TypeScript", "Node.js", "PostgreSQL", "React", "Go"],
      },
    ],
  };
}

async function withResume(email: string) {
  const user = await createUser(email);
  const data = engineerResume();
  await (await getDb()).insert(resumes).values({
    userId: user.id,
    id: data.id,
    data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return user;
}

async function bellOf(userId: string) {
  return (await getDb()).select().from(notifications).where(eq(notifications.userId, userId));
}

async function notedAt(userId: string, at: number) {
  await (
    await getDb()
  )
    .insert(notificationSettings)
    .values({ userId, jobsEmailedAt: at, updatedAt: at })
    .onConflictDoUpdate({ target: notificationSettings.userId, set: { jobsEmailedAt: at } });
}

async function settingsOf(userId: string) {
  const [row] = await (
    await getDb()
  )
    .select({
      emailedAt: notificationSettings.jobsEmailedAt,
      checkedAt: notificationSettings.jobsCheckedAt,
    })
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId));
  return row;
}

describe("runWeeklyMatches", () => {
  beforeEach(async () => {
    await resetDb();
    resetEnvForTests();
  });

  afterEach(() => {
    resetEnvForTests();
  });

  it("tells the bell of each account with a resume how many matches are new this week, once", async () => {
    await seedJobs([
      raw("1"),
      raw("2", { title: "Senior Frontend Engineer", text: "React and TypeScript." }),
      raw("3", { title: "Platform Engineer", postedAt: Date.now() - 10 * DAY_MS }),
      raw("4", { title: "Account Executive", text: "Sell with Salesforce." }),
    ]);
    const pro = await setPlan(await withResume("pro@example.com"), "pro");
    const never = await createUser("never@example.com");

    const outcome = await runWeeklyMatches(context());

    expect(outcome).toEqual({
      stats: { checked: 1, noResume: 0, nothingNew: 0, users: 1 },
      complete: true,
      failed: [],
    });
    const [row] = await bellOf(pro.id);
    expect(row).toMatchObject({
      kind: "job_matches",
      title: "2 new matches this week",
      link: "/dashboard/jobs",
    });
    expect(row!.body).toContain("Engineer at Company 1");
    expect(row!.body).toContain("Senior Frontend Engineer at Company 2");
    expect(row!.body).not.toContain("Platform Engineer");
    expect((await settingsOf(pro.id))?.emailedAt).not.toBeNull();
    expect(await bellOf(never.id)).toHaveLength(0);

    expect((await runWeeklyMatches(context())).stats.checked).toBe(0);
    expect(await bellOf(pro.id)).toHaveLength(1);
  });

  it("counts only jobs Otto first read since the last note, and waits a day when there are none", async () => {
    const lastSent = Date.now() - 6.8 * DAY_MS;
    await seedJobs([
      raw("1", { postedAt: Date.now() - 6.9 * DAY_MS }),
      raw("2", {
        title: "Senior Frontend Engineer",
        text: "React and TypeScript.",
        postedAt: Date.now() - 2 * HOUR_MS,
      }),
      raw("3", { title: "Platform Engineer", postedAt: lastSent - HOUR_MS }),
    ]);
    await firstSeen("1", lastSent - HOUR_MS);
    await firstSeen("3", lastSent + 20 * HOUR_MS);
    const user = await setPlan(await withResume("pro@example.com"), "pro");
    await notedAt(user.id, lastSent);

    await runWeeklyMatches(context());
    const [row] = await bellOf(user.id);
    expect(row?.title).toBe("2 new matches this week");
    expect(row?.body).toContain("Company 2");
    expect(row?.body).toContain("Company 3");
    expect(row?.body).not.toContain("Company 1");

    await notedAt(user.id, Date.now() + HOUR_MS - WEEKLY_JOBS.everyMs);
    expect((await runWeeklyMatches(context())).stats.checked).toBe(0);

    await notedAt(user.id, Date.now());
    const quiet = await runWeeklyMatches(context(Date.now() + WEEKLY_JOBS.everyMs));
    expect(quiet.stats).toMatchObject({ checked: 1, nothingNew: 1, users: 0 });
    const sameDay = await runWeeklyMatches(context(Date.now() + WEEKLY_JOBS.everyMs + HOUR_MS));
    expect(sameDay.stats.checked).toBe(0);
  });

  it("counts Free's closest few, as the Jobs tab shows them", async () => {
    await seedJobs(
      Array.from({ length: 8 }, (_, index) =>
        raw(String(index + 1), { postedAt: Date.now() - (index + 1) * HOUR_MS }),
      ),
    );
    const user = await withResume("free@example.com");
    await runWeeklyMatches(context());
    const [row] = await bellOf(user.id);
    expect(row?.title).toBe("5 new matches this week");
    expect(row?.body).toMatch(/ and 3 more\. On Free, Jobs shows your closest few\.$/);
  });

  it("leaves out jobs the account already saved or applied to", async () => {
    await seedJobs([
      raw("1"),
      raw("2", { title: "Backend Developer" }),
      raw("3", { title: "Software Engineer" }),
    ]);
    const user = await setPlan(await withResume("pro@example.com"), "pro");
    const db = await getDb();
    await db.insert(savedJobs).values({ userId: user.id, jobId: await jobIdOf("1"), savedAt: 1 });
    const applied = {
      userId: user.id,
      company: "Company",
      appliedAt: 1,
      statusChangedAt: 1,
      createdAt: 1,
      updatedAt: 1,
    };
    await db
      .insert(applications)
      .values({ ...applied, id: crypto.randomUUID(), jobId: await jobIdOf("2") });

    await runWeeklyMatches(context());
    const [first] = await bellOf(user.id);
    expect(first).toMatchObject({
      title: "1 new match this week",
      body: "Software Engineer at Company 3.",
    });

    await db.delete(applications);
    await db.delete(savedJobs);
    await db.delete(notifications);
    await db
      .insert(applications)
      .values({ ...applied, id: crypto.randomUUID(), jobUrl: jobUrl("3") });
    await db
      .insert(applications)
      .values({ ...applied, id: crypto.randomUUID(), jobUrl: jobUrl("1") });
    await db.update(notificationSettings).set({ jobsEmailedAt: null, jobsCheckedAt: null });
    await runWeeklyMatches(context());
    const [again] = await bellOf(user.id);
    expect(again?.body).toBe("Backend Developer at Company 2.");
  });

  it("names two jobs and counts the rest", () => {
    expect(matchesNotice({ fresh: 2, names: ["A at X", "B at Y"], free: false })).toEqual({
      title: "2 new matches this week",
      body: "A at X and B at Y.",
    });
    expect(matchesNotice({ fresh: 9, names: ["A at X", "B at Y"], free: false }).body).toBe(
      "A at X, B at Y and 7 more.",
    );
  });
});
