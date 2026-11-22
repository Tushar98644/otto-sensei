import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import { cookieJar, createUser, resetDb, signInAs } from "@/lib/auth/test-helpers";
import type { InterviewOutcomeResponse } from "@/lib/interviews/types";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const DAY = 86_400_000;
const INTERVIEW = Date.now() - DAY;
const FOLLOW_UP = Date.now() + 6 * DAY;

function answer(id: string, body: unknown) {
  return POST(
    new Request(`http://localhost/api/applications/${id}/outcome`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

async function seed(userId: string, status: "interview" | "applied" = "interview") {
  const id = crypto.randomUUID();
  await (await getDb()).insert(applications).values({
    id,
    userId,
    company: "Stripe",
    appliedAt: INTERVIEW - 10 * DAY,
    status,
    stageReached: "interview",
    statusChangedAt: INTERVIEW - 5 * DAY,
    statusHistory: [{ status: "interview", at: INTERVIEW - 5 * DAY }],
    interviewAt: INTERVIEW,
    interviewTime: 600,
    interviewZone: "Asia/Kolkata",
    interviewAskedFor: INTERVIEW,
    followUpAt: FOLLOW_UP,
    createdAt: INTERVIEW - 10 * DAY,
    updatedAt: INTERVIEW,
  });
  return id;
}

async function row(id: string) {
  const [found] = await (await getDb()).select().from(applications).where(eq(applications.id, id));
  return found!;
}

describe("POST /api/applications/[id]/outcome", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("needs the account that owns the interview", async () => {
    const other = await createUser("other@example.com");
    const theirs = await seed(other.id);
    expect((await answer(theirs, { outcome: "waiting" })).status).toBe(401);
    await signInAs("maya@example.com");
    expect((await answer(theirs, { outcome: "waiting" })).status).toBe(404);
    expect((await row(theirs)).interviewAnsweredFor).toBeNull();
  });

  it("Waiting closes the question and keeps the follow-up reminder", async () => {
    const maya = await signInAs("maya@example.com");
    const id = await seed(maya.id);
    const res = await answer(id, { outcome: "waiting" });
    expect(res.status).toBe(200);
    const { application } = (await res.json()) as InterviewOutcomeResponse;
    expect(application).toMatchObject({
      status: "interview",
      followUpAt: FOLLOW_UP,
      interviewAt: INTERVIEW,
    });
    expect((await row(id)).interviewAnsweredFor).toBe(INTERVIEW);
  });

  it("Next round clears the day, its time and the reminder, ready for the next one", async () => {
    const maya = await signInAs("maya@example.com");
    const id = await seed(maya.id);
    const { application } = (await (
      await answer(id, { outcome: "next_round" })
    ).json()) as InterviewOutcomeResponse;
    expect(application).toMatchObject({
      status: "interview",
      interviewAt: null,
      interviewTime: null,
      interviewZone: null,
      followUpAt: null,
    });
    expect((await row(id)).interviewAnsweredFor).toBe(INTERVIEW);
  });

  it("Rejected closes the card, with the move in its history", async () => {
    const maya = await signInAs("maya@example.com");
    const id = await seed(maya.id);
    const { application } = (await (
      await answer(id, { outcome: "rejected" })
    ).json()) as InterviewOutcomeResponse;
    expect(application).toMatchObject({
      status: "rejected",
      followUpAt: null,
      stageReached: "interview",
    });
    expect((await row(id)).statusHistory.at(-1)?.status).toBe("rejected");
  });

  it("answers only an application still at the interview stage", async () => {
    const maya = await signInAs("maya@example.com");
    const id = await seed(maya.id, "applied");
    expect((await answer(id, { outcome: "waiting" })).status).toBe(404);
    expect((await answer("not-an-id", { outcome: "waiting" })).status).toBe(404);
    expect((await answer(id, { outcome: "hired" })).status).toBe(400);
  });
});
