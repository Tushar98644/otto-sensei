import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { notifications, resumes } from "@/db/schema";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { emptyResume, newBullet, newId, type Resume } from "@/lib/resume/schema";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import {
  addAlert,
  alertNotice,
  JOB_ALERTS,
  listAlerts,
  NewJobAlertSchema,
  removeAlert,
  runJobAlerts,
} from "./alerts";
import type { RawJob } from "./parsers";
import { saveJobs, syncBoards } from "./store";
import { DEFAULT_FILTERS, NO_CHOICE } from "./types";

const context = (now: number) => ({ now, deadline: Date.now() + 30_000 });

function raw(id: string, overrides: Partial<RawJob> = {}): RawJob {
  return {
    externalId: id,
    company: `Company ${id}`,
    title: "Backend Engineer",
    location: "Berlin, Germany",
    remote: false,
    employmentType: "full_time",
    postedAt: Date.now() - DAY_MS,
    validThrough: null,
    url: `https://job-boards.greenhouse.io/acme/jobs/${id}`,
    text: "Build services in TypeScript, Node.js and PostgreSQL on Kubernetes.",
    ...overrides,
  };
}

async function seedJobs(list: RawJob[], at = Date.now()) {
  const db = await getDb();
  await syncBoards(db, [{ ats: "greenhouse", token: "acme", company: "Acme" }]);
  await saveJobs(db, { source: "greenhouse", board: "acme" }, list, at, { snapshot: false });
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
    skills: [{ id: newId(), label: "Skills", items: ["TypeScript", "Node.js", "PostgreSQL"] }],
  };
}

async function proWithResume(email: string) {
  const user = await createUser(email);
  await setPlan(user, "pro");
  const data = engineerResume();
  await (
    await getDb()
  )
    .insert(resumes)
    .values({ userId: user.id, id: data.id, data, createdAt: Date.now(), updatedAt: Date.now() });
  return user;
}

const alert = (name: string) =>
  NewJobAlertSchema.parse({
    name,
    filters: { ...DEFAULT_FILTERS, workMode: "onsite" },
    choice: NO_CHOICE,
  });

async function bellOf(userId: string) {
  return (await getDb()).select().from(notifications).where(eq(notifications.userId, userId));
}

describe("job alerts", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("keeps up to five per account, and never a point", async () => {
    const db = await getDb();
    const user = await proWithResume("ada@example.com");
    for (let i = 0; i < JOB_ALERTS.perAccount; i++)
      expect((await addAlert(db, user.id, alert(`Search ${i}`), Date.now())).kind).toBe("added");
    expect((await addAlert(db, user.id, alert("One more"), Date.now())).kind).toBe("full");
    const [first] = await listAlerts(db, user.id);
    expect(await removeAlert(db, user.id, first!.id, Date.now())).toHaveLength(4);
    expect(
      NewJobAlertSchema.safeParse({
        name: "Near me",
        filters: { ...DEFAULT_FILTERS, near: { city: null, lat: 52.5, lng: 13.4, km: 25 } },
        choice: NO_CHOICE,
      }).success,
    ).toBe(false);
  });

  it("rings the bell once for new matching jobs, then only for newer ones", async () => {
    const db = await getDb();
    const user = await proWithResume("ada@example.com");
    const made = Date.now() - 2 * DAY_MS;
    await addAlert(db, user.id, alert("Backend in Berlin"), made);
    await seedJobs([raw("1"), raw("2", { location: "Remote - Germany", remote: true })]);

    const first = await runJobAlerts(context(Date.now()));
    expect(first.stats).toMatchObject({ checked: 1, rang: 1 });
    const bell = await bellOf(user.id);
    expect(bell).toHaveLength(1);
    expect(bell[0]).toMatchObject({
      kind: "job_matches",
      title: "1 new job for “Backend in Berlin”",
      body: "Backend Engineer at Company 1.",
      link: "/dashboard/jobs",
    });

    // The same day it isn't due again; the next day nothing newer means no note.
    expect((await runJobAlerts(context(Date.now()))).stats).toMatchObject({ checked: 0 });
    expect((await runJobAlerts(context(Date.now() + 21 * HOUR_MS))).stats).toMatchObject({
      checked: 1,
      rang: 0,
    });
    expect(await bellOf(user.id)).toHaveLength(1);
  });

  it("stays quiet on Free, and words the note in the account's language", async () => {
    const db = await getDb();
    const user = await createUser("free@example.com");
    await addAlert(db, user.id, alert("Anything"), Date.now() - DAY_MS);
    await seedJobs([raw("1")]);
    expect((await runJobAlerts(context(Date.now()))).stats).toMatchObject({ users: 0, checked: 0 });
    expect(
      alertNotice({ name: "Backend" }, { fresh: 3, names: ["A at B", "C at D"] }, "de"),
    ).toEqual({ title: "3 neue Jobs für „Backend“", body: "A at B, C at D und 1 weitere." });
  });
});
