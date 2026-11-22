import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  applications,
  emailLog,
  jobs,
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
import { saveEmailChoices } from "./choices";
import type { BatchResult, EmailMessage, EmailSender } from "./email";
import { runWeeklyJobEmails, WEEKLY_JOBS } from "./weekly-jobs";

const context = (now = Date.now()) => ({ now, deadline: Date.now() + 30_000 });

function fakeSender(
  answer?: (count: number) => BatchResult,
): EmailSender & { messages: EmailMessage[] } {
  const messages: EmailMessage[] = [];
  return {
    messages,
    async sendBatch(batch) {
      messages.push(...batch);
      return answer ? answer(batch.length) : { sent: batch.length, failed: 0 };
    },
  };
}

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

async function optedIn(email: string, { resume = true } = {}) {
  const user = await createUser(email);
  if (resume) {
    const data = engineerResume();
    await (await getDb()).insert(resumes).values({
      userId: user.id,
      id: data.id,
      data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  await saveEmailChoices(user.id, { jobEmails: true });
  return user;
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

describe("runWeeklyJobEmails", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.NEXT_PUBLIC_APP_URL = "https://otto.test";
    process.env.CRON_SECRET = "cron-secret-for-tests-0123456789";
    resetEnvForTests();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.CRON_SECRET;
    delete process.env.OPTIONAL_EMAILS_PER_DAY;
    resetEnvForTests();
  });

  it("emails opted-in accounts the week's new matches once, and no one else", async () => {
    await seedJobs([
      raw("1"),
      raw("2", { title: "Senior Frontend Engineer", text: "React and TypeScript." }),
      raw("3", { title: "Platform Engineer", postedAt: Date.now() - 10 * DAY_MS }),
      raw("4", { title: "Account Executive", text: "Sell with Salesforce." }),
    ]);
    const pro = await setPlan(await optedIn("pro@example.com"), "pro");
    await createUser("never@example.com");
    const left = await optedIn("left@example.com");
    await saveEmailChoices(left.id, { jobEmails: false });
    const noResume = await optedIn("no-resume@example.com", { resume: false });

    const sender = fakeSender();
    const outcome = await runWeeklyJobEmails(context(), { sender });

    expect(outcome).toEqual({
      stats: {
        checked: 2,
        noResume: 1,
        nothingNew: 0,
        users: 1,
        emailsSent: 1,
        emailsFailed: 0,
        emailsSkipped: 0,
        released: 0,
      },
      complete: true,
      failed: [],
    });
    const [message] = sender.messages;
    expect(message?.to).toBe("pro@example.com");
    expect(message?.subject).toBe("2 new jobs match your resume");
    expect(message?.text).toContain("2 jobs posted in the past week match your resume.");
    expect(message?.text).toContain("Backend Engineer");
    expect(message?.text).toContain("https://job-boards.greenhouse.io/acme/jobs/1");
    expect(message?.text).not.toContain("Platform Engineer");
    expect(message?.text).toContain(
      "See all your matches: https://otto.test/dashboard/jobs?utm_source=otto&utm_medium=email&utm_campaign=weekly_jobs&utm_content=jobs",
    );
    expect(message?.text).toMatch(
      /Tailor your resume: https:\/\/otto\.test\/dashboard\/jobs\?utm_source=otto&utm_medium=email&utm_campaign=weekly_jobs&utm_content=tailor&tailor=[0-9a-f-]{36}/,
    );
    expect(message?.headers?.["List-Unsubscribe"]).toMatch(/&l=jobs>$/);
    expect(message?.tags).toEqual([{ name: "kind", value: "weekly_jobs" }]);
    expect((await settingsOf(pro.id))?.emailedAt).not.toBeNull();
    expect((await settingsOf(noResume.id))?.checkedAt).not.toBeNull();

    const again = fakeSender();
    expect((await runWeeklyJobEmails(context(), { sender: again })).stats.checked).toBe(0);
    expect(again.messages).toHaveLength(0);
  });

  it("lists only jobs Otto first read since the last email, and waits a day when there are none", async () => {
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
    const user = await setPlan(await optedIn("pro@example.com"), "pro");
    const db = await getDb();
    await db
      .update(notificationSettings)
      .set({ jobsEmailedAt: lastSent })
      .where(eq(notificationSettings.userId, user.id));

    const sender = fakeSender();
    await runWeeklyJobEmails(context(), { sender });
    expect(sender.messages[0]?.text).toContain("Senior Frontend Engineer");
    expect(sender.messages[0]?.text).toContain("acme/jobs/3");
    expect(sender.messages[0]?.text).not.toContain("acme/jobs/1");

    await db
      .update(notificationSettings)
      .set({ jobsEmailedAt: Date.now() + HOUR_MS - WEEKLY_JOBS.everyMs })
      .where(eq(notificationSettings.userId, user.id));
    const notDue = await runWeeklyJobEmails(context(), { sender: fakeSender() });
    expect(notDue.stats.checked).toBe(0);

    await db
      .update(notificationSettings)
      .set({ jobsEmailedAt: Date.now() })
      .where(eq(notificationSettings.userId, user.id));
    const quiet = await runWeeklyJobEmails(context(Date.now() + WEEKLY_JOBS.everyMs), {
      sender: fakeSender(),
    });
    expect(quiet.stats).toMatchObject({ checked: 1, nothingNew: 1, users: 0 });
    const sameDay = await runWeeklyJobEmails(context(Date.now() + WEEKLY_JOBS.everyMs + HOUR_MS), {
      sender: fakeSender(),
    });
    expect(sameDay.stats.checked).toBe(0);
  });

  it("shows Free its closest few, as the Jobs tab does", async () => {
    await seedJobs(
      Array.from({ length: 8 }, (_, index) =>
        raw(String(index + 1), { postedAt: Date.now() - (index + 1) * HOUR_MS }),
      ),
    );
    await optedIn("free@example.com");
    const sender = fakeSender();
    await runWeeklyJobEmails(context(), { sender });
    const [message] = sender.messages;
    expect(message?.text.match(/^- /gm)).toHaveLength(5);
    expect(message?.text).toContain(
      "On Free, the Jobs tab shows your closest 5. Pro shows every match.",
    );
    expect(message?.text).toContain("Open Jobs: https://otto.test/dashboard/jobs");
  });

  it("leaves out jobs the account already saved or applied to", async () => {
    await seedJobs([
      raw("1"),
      raw("2", { title: "Backend Developer" }),
      raw("3", { title: "Software Engineer" }),
    ]);
    const user = await setPlan(await optedIn("pro@example.com"), "pro");
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

    const sender = fakeSender();
    await runWeeklyJobEmails(context(), { sender });
    const text = sender.messages[0]?.text ?? "";
    expect(text).toContain("acme/jobs/3");
    expect(text).not.toContain("acme/jobs/1");
    expect(text).not.toContain("acme/jobs/2");

    await db.delete(applications);
    await db.delete(savedJobs);
    await db
      .insert(applications)
      .values({ ...applied, id: crypto.randomUUID(), jobUrl: jobUrl("3") });
    await db
      .insert(applications)
      .values({ ...applied, id: crypto.randomUUID(), jobUrl: jobUrl("1") });
    await db.update(notificationSettings).set({ jobsEmailedAt: null, jobsCheckedAt: null });
    const again = fakeSender();
    await runWeeklyJobEmails(context(), { sender: again });
    expect(again.messages[0]?.text).toContain("acme/jobs/2");
    expect(again.messages[0]?.text).not.toContain("acme/jobs/3");
  });

  it("keeps within the day's allowance of optional emails, counting tips sent today", async () => {
    process.env.OPTIONAL_EMAILS_PER_DAY = "3";
    await seedJobs([raw("1")]);
    const db = await getDb();
    for (const name of ["a", "b", "c"]) {
      const user = await setPlan(await optedIn(`${name}@example.com`), "pro");
      if (name === "a") {
        await db.insert(emailLog).values({
          userId: user.id,
          kind: "no_resume",
          occasion: "once",
          createdAt: Date.now() - HOUR_MS,
        });
      }
    }
    const sender = fakeSender();
    const outcome = await runWeeklyJobEmails(context(), { sender });
    expect(sender.messages).toHaveLength(2);
    expect(outcome.complete).toBe(false);

    const repeat = fakeSender();
    await runWeeklyJobEmails(context(Date.now() + HOUR_MS), { sender: repeat });
    expect(repeat.messages).toHaveLength(0);
  });

  it("gives the week back when Resend turns the whole batch away", async () => {
    await seedJobs([raw("1")]);
    const user = await setPlan(await optedIn("pro@example.com"), "pro");
    const outcome = await runWeeklyJobEmails(context(), {
      sender: fakeSender((count) => ({ sent: 0, failed: count, refused: true })),
    });
    expect(outcome.stats).toMatchObject({ users: 1, emailsFailed: 1, released: 1 });
    expect((await settingsOf(user.id))?.emailedAt).toBeNull();

    const sender = fakeSender();
    await runWeeklyJobEmails(context(Date.now() + WEEKLY_JOBS.recheckMs), { sender });
    expect(sender.messages).toHaveLength(1);
  });

  it("stamps nothing when email isn't set up, so opting in still works once it is", async () => {
    await seedJobs([raw("1")]);
    const user = await optedIn("pro@example.com");
    const outcome = await runWeeklyJobEmails(context(), { sender: null });
    expect(outcome.stats).toMatchObject({ checked: 0, emailOff: 1 });
    expect(await settingsOf(user.id)).toEqual({ emailedAt: null, checkedAt: null });
  });
});
