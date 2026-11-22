import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { applications, notifications, workProfiles } from "@/db/schema";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import type { InterviewPrep } from "@/lib/insights/prep";
import { listNotifications } from "@/lib/notifications/records";
import {
  askDue,
  briefDue,
  followUpAfter,
  runInterviewAutopilot,
  todayNotice,
  zoneFor,
  type Candidate,
} from "./autopilot";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// Local noon in Kolkata on each day, as the board saves an interview day.
const noonIst = (day: number) => Date.UTC(2026, 10, day, 6, 30);
// 07:07 in Kolkata on 24 November.
const MORNING = Date.UTC(2026, 10, 24, 1, 37);

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: "a1",
    userId: "u1",
    interviewAt: noonIst(24),
    interviewTime: null,
    interviewZone: null,
    briefedFor: null,
    askedFor: null,
    profileZone: "Asia/Kolkata",
    ...overrides,
  };
}

describe("when the brief and the question are due", () => {
  it("sends the brief at about 7:00 on the interview's own day, once", () => {
    expect(briefDue(candidate(), Date.UTC(2026, 10, 24, 1, 0))).toBe(false);
    expect(briefDue(candidate(), MORNING)).toBe(true);
    expect(briefDue(candidate({ briefedFor: noonIst(24) }), MORNING)).toBe(false);
    expect(briefDue(candidate({ interviewAt: noonIst(25) }), MORNING)).toBe(false);
    // A missed morning still sends a day-only brief until noon, never after.
    expect(briefDue(candidate(), Date.UTC(2026, 10, 24, 6, 0))).toBe(true);
    expect(briefDue(candidate(), Date.UTC(2026, 10, 24, 6, 45))).toBe(false);
  });

  it("sends it two hours ahead for an early interview, and never once it has started", () => {
    const early = candidate({ interviewTime: 8 * 60, interviewZone: "Asia/Kolkata" });
    expect(briefDue(early, Date.UTC(2026, 10, 24, 0, 15))).toBe(false);
    expect(briefDue(early, Date.UTC(2026, 10, 24, 0, 45))).toBe(true);
    expect(briefDue(early, Date.UTC(2026, 10, 24, 2, 31))).toBe(false);
  });

  it("reads a typed time in the zone it was typed in", () => {
    const newYork = candidate({
      interviewAt: Date.UTC(2026, 10, 24, 17),
      interviewTime: 14 * 60,
      interviewZone: "America/New_York",
    });
    expect(zoneFor(newYork)).toBe("America/New_York");
    expect(zoneFor(candidate())).toBe("Asia/Kolkata");
    // 07:07 in New York, though the account's own zone is Kolkata.
    expect(briefDue(newYork, Date.UTC(2026, 10, 24, 12, 7))).toBe(true);
    expect(briefDue(newYork, MORNING)).toBe(false);
  });

  it("asks how it went the morning after, catches up later in the week, then stops", () => {
    const after = Date.UTC(2026, 10, 25, 1, 37);
    expect(askDue(candidate(), MORNING)).toBe(false);
    expect(askDue(candidate(), Date.UTC(2026, 10, 25, 1, 0))).toBe(false);
    expect(askDue(candidate(), after)).toBe(true);
    expect(askDue(candidate(), Date.UTC(2026, 10, 26, 0, 0))).toBe(true);
    expect(askDue(candidate({ askedFor: noonIst(24) }), after)).toBe(false);
    expect(askDue(candidate(), noonIst(24) + 8 * DAY)).toBe(false);
  });

  it("sets the follow-up 5 business days after the interview day", () => {
    expect(followUpAfter(noonIst(20), "Asia/Kolkata")).toBe(Date.UTC(2026, 10, 26, 18, 30));
    expect(followUpAfter(noonIst(23), "Asia/Kolkata")).toBe(Date.UTC(2026, 10, 29, 18, 30));
  });
});

const PREP: InterviewPrep = {
  version: 3,
  technical: null,
  job: { title: "Product Designer", company: "Stripe" },
  questions: [
    { round: "fit", question: "Why Stripe?", checking: "", followUp: "", points: [], story: null },
  ],
  stories: [
    {
      title: "Checkout redesign",
      line: "Cut checkout from 5 steps to 2",
      place: "",
      situation: "",
      task: "",
      action: "",
      result: "",
    },
  ],
  asks: ["What does success look like in 90 days?"],
  createdAt: 1,
  demo: false,
};

async function profile(userId: string, timeZone: string) {
  await (
    await getDb()
  )
    .insert(workProfiles)
    .values({ userId, timeZone, createdAt: 0, updatedAt: 0 });
}

async function interview(
  userId: string,
  company: string,
  interviewAt: number,
  extra: Partial<typeof applications.$inferInsert> = {},
): Promise<string> {
  const id = crypto.randomUUID();
  await (await getDb()).insert(applications).values({
    id,
    userId,
    company,
    role: "Product Designer",
    appliedAt: interviewAt - 20 * DAY,
    status: "interview",
    statusChangedAt: interviewAt - 5 * DAY,
    interviewAt,
    createdAt: interviewAt - 20 * DAY,
    updatedAt: interviewAt - 5 * DAY,
    ...extra,
  });
  return id;
}

async function row(id: string) {
  const [found] = await (await getDb()).select().from(applications).where(eq(applications.id, id));
  return found!;
}

const run = (now: number) => runInterviewAutopilot({ now, deadline: Date.now() + 30_000 });

async function bellOf(userId: string, now: number) {
  return (await listNotifications(userId, 30, now)).notifications;
}

describe("the morning's bell row", () => {
  it("says the company and time and points at the prep page", () => {
    const item = { id: "a1", company: "Stripe", hasPrep: true, canPrep: true };
    expect(todayNotice(item, "2:30 PM")).toEqual({
      title: "Today: your interview with Stripe at 2:30 PM",
      body: "Your strongest stories, likely questions and questions to ask are on your prep page.",
      link: "/dashboard/interview/a1",
      applicationId: "a1",
    });
    expect(todayNotice({ ...item, company: "" }, null).title).toBe("Today: your interview");
  });

  it("offers a one-click pack when there is none, and sells nothing on Free", () => {
    const item = { id: "a1", company: "Stripe", hasPrep: false, canPrep: true };
    expect(todayNotice(item, null).body).toContain("One click makes one");
    expect(todayNotice({ ...item, canPrep: false }, null).body).toBe(
      "Read the job post once more and pick two stories from your resume to tell.",
    );
  });
});

describe("runInterviewAutopilot", () => {
  beforeEach(async () => {
    await resetDb();
    resetEnvForTests();
  });

  afterEach(() => {
    resetEnvForTests();
  });

  it("puts today's brief and yesterday's question in the bell, on top, and never twice", async () => {
    const maya = await setPlan(await createUser("maya@example.com"), "pro");
    await profile(maya.id, "Asia/Kolkata");
    const stripe = await interview(maya.id, "Stripe", noonIst(24), {
      prep: PREP,
      interviewTime: 14 * 60 + 30,
      interviewZone: "Asia/Kolkata",
    });
    const figma = await interview(maya.id, "Figma", noonIst(23));

    const outcome = await run(MORNING);

    expect(outcome.stats).toMatchObject({ users: 1, briefs: 1, asks: 1 });
    expect((await row(stripe)).interviewBriefedFor).toBe(noonIst(24));
    expect((await row(figma)).interviewAskedFor).toBe(noonIst(23));
    // Monday 30 November, the start of that day in Kolkata.
    expect((await row(figma)).followUpAt).toBe(Date.UTC(2026, 10, 29, 18, 30));

    const bell = await bellOf(maya.id, MORNING);
    expect(bell).toHaveLength(2);
    expect(bell[0]).toMatchObject({
      kind: "interview_today",
      title: "Today: your interview with Stripe at 2:30 PM",
      applicationId: stripe,
      link: `/dashboard/interview/${stripe}`,
    });
    expect(bell[1]).toMatchObject({
      kind: "interview_after",
      title: "How did your interview with Figma go?",
      applicationId: figma,
      outcomeOpen: true,
      link: `/dashboard/applications/${figma}`,
    });
    expect(bell[1]!.body).toContain("follow up on Mon, Nov 30");

    const again = await run(MORNING + 10 * 60_000);
    expect(again.stats).toMatchObject({ users: 0, briefs: 0, asks: 0 });
    expect(await bellOf(maya.id, MORNING)).toHaveLength(2);
  });

  it("asks on any plan, on the person's own morning", async () => {
    const sam = await createUser("sam@example.com");
    await profile(sam.id, "America/New_York");
    const linear = await interview(sam.id, "Linear", Date.UTC(2026, 10, 23, 17));
    const notion = await interview(sam.id, "Notion", Date.UTC(2026, 10, 24, 17));

    // 07:30 on 24 November in New York.
    const outcome = await run(Date.UTC(2026, 10, 24, 12, 30));

    expect(outcome.stats).toMatchObject({ asks: 1, briefs: 1 });
    const rows = await (
      await getDb()
    )
      .select()
      .from(notifications)
      .where(eq(notifications.userId, sam.id));
    expect(rows.map((item) => [item.kind, item.applicationId]).sort()).toEqual(
      [
        ["interview_after", linear],
        ["interview_today", notion],
      ].sort(),
    );
    const today = rows.find((item) => item.kind === "interview_today")!;
    expect(today.body).not.toContain("One click");
  });

  it("briefs a moved interview again on its new day", async () => {
    const maya = await setPlan(await createUser("maya@example.com"), "pro");
    await profile(maya.id, "Asia/Kolkata");
    const stripe = await interview(maya.id, "Stripe", noonIst(24), {
      interviewBriefedFor: noonIst(20),
    });

    const outcome = await run(MORNING);

    expect(outcome.stats).toMatchObject({ briefs: 1 });
    expect((await row(stripe)).interviewBriefedFor).toBe(noonIst(24));
    expect((await bellOf(maya.id, MORNING))[0]!.body).toContain("One click makes one");
  });
});
