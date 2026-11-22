import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { applications, notifications, workProfiles } from "@/db/schema";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import type { InterviewPrep } from "@/lib/insights/prep";
import { readEmailChoices, saveEmailChoices, stopEmails } from "@/lib/notifications/choices";
import type { EmailMessage, EmailSender } from "@/lib/notifications/email";
import { listNotifications } from "@/lib/notifications/records";
import {
  askDue,
  briefDue,
  followUpAfter,
  runInterviewAutopilot,
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
    briefsOn: true,
    ...overrides,
  };
}

describe("when the brief and the question are due", () => {
  it("sends the brief at about 7:00 on the interview's own day, once", () => {
    expect(briefDue(candidate(), Date.UTC(2026, 10, 24, 1, 0))).toBe(false);
    expect(briefDue(candidate(), MORNING)).toBe(true);
    expect(briefDue(candidate({ briefedFor: noonIst(24) }), MORNING)).toBe(false);
    expect(briefDue(candidate({ briefsOn: false }), MORNING)).toBe(false);
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
  version: 2,
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

function fakeSender(refuse = false) {
  const calls: { messages: EmailMessage[]; key: string }[] = [];
  const sender: EmailSender = {
    async sendBatch(messages, key) {
      calls.push({ messages, key });
      return refuse
        ? { sent: 0, failed: messages.length, refused: true as const }
        : { sent: messages.length, failed: 0 };
    },
  };
  return { sender, calls };
}

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

const run = (now: number, sender: EmailSender | null) =>
  runInterviewAutopilot({ now, deadline: Date.now() + 30_000 }, { sender });

describe("runInterviewAutopilot", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.CRON_SECRET = "test-cron-secret-0123456789";
    process.env.NEXT_PUBLIC_APP_URL = "https://otto.test";
    resetEnvForTests();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.OPTIONAL_EMAILS_PER_DAY;
    resetEnvForTests();
  });

  it("briefs today's interview and asks about yesterday's in one email, and rings the bell", async () => {
    const maya = await setPlan(await createUser("maya@example.com"), "pro");
    await profile(maya.id, "Asia/Kolkata");
    await saveEmailChoices(maya.id, { briefEmails: true });
    const stripe = await interview(maya.id, "Stripe", noonIst(24), { prep: PREP });
    const figma = await interview(maya.id, "Figma", noonIst(23));
    const { sender, calls } = fakeSender();

    const outcome = await run(MORNING, sender);

    expect(outcome.stats).toMatchObject({ users: 1, briefs: 1, asks: 1, emailsSent: 1 });
    const [email] = calls[0]!.messages;
    expect(email!.to).toBe("maya@example.com");
    expect(email!.subject).toBe("Today: your interview with Stripe");
    expect(email!.text).toContain(
      "Your strongest stories\n- Checkout redesign: Cut checkout from 5 steps to 2",
    );
    expect(email!.text).toContain("How did your interview with Figma go yesterday?");
    expect(email!.text).toContain(`/dashboard/applications/${figma}?write=thank-you`);
    expect(email!.text).toContain("l=briefs");
    expect((await row(stripe)).interviewBriefedFor).toBe(noonIst(24));
    expect((await row(figma)).interviewAskedFor).toBe(noonIst(23));
    // Monday 30 November, the start of that day in Kolkata.
    expect((await row(figma)).followUpAt).toBe(Date.UTC(2026, 10, 29, 18, 30));

    const bell = await listNotifications(maya.id, 30, MORNING);
    expect(bell.notifications).toHaveLength(1);
    expect(bell.notifications[0]).toMatchObject({
      kind: "interview_after",
      title: "How did your interview with Figma go?",
      applicationId: figma,
      outcomeOpen: true,
      link: `/dashboard/applications/${figma}`,
    });
    expect(bell.notifications[0]!.body).toContain("follow up on Mon, Nov 30");

    const again = await run(MORNING + 10 * 60_000, sender);
    expect(again.stats).toMatchObject({ users: 0, briefs: 0, asks: 0, emailsSent: 0 });
    expect(calls).toHaveLength(1);
  });

  it("asks in the bell only, on any plan, when the email isn't turned on", async () => {
    const sam = await createUser("sam@example.com");
    await profile(sam.id, "America/New_York");
    const linear = await interview(sam.id, "Linear", Date.UTC(2026, 10, 23, 17));
    await interview(sam.id, "Notion", Date.UTC(2026, 10, 24, 17));
    const { sender, calls } = fakeSender();

    // 07:30 on 24 November in New York.
    const outcome = await run(Date.UTC(2026, 10, 24, 12, 30), sender);

    expect(outcome.stats).toMatchObject({ asks: 1, briefs: 0, emailsSent: 0 });
    expect(calls).toHaveLength(0);
    const rows = await (
      await getDb()
    )
      .select()
      .from(notifications)
      .where(eq(notifications.userId, sam.id));
    expect(rows.map((item) => item.applicationId)).toEqual([linear]);
  });

  it("briefs a moved interview again on its new day", async () => {
    const maya = await setPlan(await createUser("maya@example.com"), "pro");
    await profile(maya.id, "Asia/Kolkata");
    await saveEmailChoices(maya.id, { briefEmails: true });
    const stripe = await interview(maya.id, "Stripe", noonIst(24), {
      interviewBriefedFor: noonIst(20),
    });
    const { sender, calls } = fakeSender();

    await run(MORNING, sender);

    expect(calls).toHaveLength(1);
    expect((await row(stripe)).interviewBriefedFor).toBe(noonIst(24));
  });

  it("leaves the brief for a later run when the optional email budget is spent, but still asks", async () => {
    process.env.OPTIONAL_EMAILS_PER_DAY = "0";
    const maya = await setPlan(await createUser("maya@example.com"), "pro");
    await profile(maya.id, "Asia/Kolkata");
    await saveEmailChoices(maya.id, { briefEmails: true });
    const stripe = await interview(maya.id, "Stripe", noonIst(24));
    const figma = await interview(maya.id, "Figma", noonIst(23));
    const { sender, calls } = fakeSender();

    const outcome = await run(MORNING, sender);

    expect(outcome.stats).toMatchObject({ briefs: 0, asks: 1, emailsSent: 0 });
    expect(calls).toHaveLength(0);
    expect((await row(stripe)).interviewBriefedFor).toBeNull();
    expect((await row(figma)).interviewAskedFor).toBe(noonIst(23));
  });

  it("puts the brief back when Resend takes none of the batch", async () => {
    const maya = await setPlan(await createUser("maya@example.com"), "pro");
    await profile(maya.id, "Asia/Kolkata");
    await saveEmailChoices(maya.id, { briefEmails: true });
    const stripe = await interview(maya.id, "Stripe", noonIst(24));

    const outcome = await run(MORNING, fakeSender(true).sender);

    expect(outcome.stats).toMatchObject({ released: 1 });
    expect((await row(stripe)).interviewBriefedFor).toBeNull();
  });

  it("offers no prep pack or thank-you on Free", async () => {
    const sam = await createUser("sam@example.com");
    await profile(sam.id, "Asia/Kolkata");
    await saveEmailChoices(sam.id, { briefEmails: true });
    await interview(sam.id, "Stripe", noonIst(24));
    await interview(sam.id, "Figma", noonIst(23));
    const { sender, calls } = fakeSender();

    await run(MORNING, sender);

    const text = calls[0]!.messages[0]!.text;
    expect(text).not.toContain("start=1");
    expect(text).not.toContain("write=thank-you");
  });

  it("stops after the one-click unsubscribe, which answers its card for good", async () => {
    const maya = await createUser("maya@example.com");
    await saveEmailChoices(maya.id, { briefEmails: true });
    expect(await stopEmails(maya.id, "briefs")).toBe(true);
    expect(await readEmailChoices(maya.id)).toMatchObject({
      briefEmails: false,
      briefPromptClosed: true,
    });
  });
});
