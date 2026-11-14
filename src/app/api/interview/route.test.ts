import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRO_TRIAL } from "@/config/plans";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import type {
  ApiErrorBody,
  InterviewPacksResponse,
  InterviewPrepResponse,
  InterviewRequestBody,
  InterviewResponse,
} from "@/lib/api/types";
import {
  cookieJar,
  fakeAuth,
  jsonRequest,
  resetDb,
  signInAs,
  signInOnTrial,
} from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import type { InterviewPrep } from "@/lib/insights/prep";
import { getPrep, savePrep } from "@/lib/insights/prep-store";
import { createSampleResume } from "@/lib/resume/sample";
import { getUsage } from "@/lib/usage";
import { createApplication } from "../applications/records";
import { GET } from "./[id]/route";
import { GET as listPacks, POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const TRIAL_END = Date.UTC(2099, 0, 15, 12);
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);

const JOB_POST =
  "We're hiring a Senior Product Marketing Manager to lead launches for our B2B analytics suite.\n" +
  "What you bring:\n- B2B SaaS launches\n- SQL for campaign analysis\n";

function body(applicationId: string): InterviewRequestBody {
  return {
    applicationId,
    resume: createSampleResume(NOW),
    job: { text: JOB_POST, title: "Senior Product Marketing Manager", company: "Contoso" },
  };
}

async function newApplication(userId: string): Promise<string> {
  const result = await createApplication(userId, {
    resumeId: null,
    resumeTitle: "",
    company: "Contoso",
    role: "Senior Product Marketing Manager",
    jobUrl: "https://example.com/jobs/1",
    appliedAt: NOW - 1000,
    status: "interview",
    notes: "",
  });
  if (result.status !== "created") throw new Error("setup failed");
  return result.application.id;
}

const prepRequest = (id: string) =>
  GET(new Request(`http://localhost/api/interview/${id}`), { params: Promise.resolve({ id }) });

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

beforeEach(async () => {
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.useRealTimers();
  resetEnvForTests();
});

describe("POST /api/interview", () => {
  it("needs a signed-in user", async () => {
    const res = await POST(jsonRequest("/api/interview", body(crypto.randomUUID())));
    expect(res.status).toBe(401);
    expect((await errorOf(res)).message).toBe("Sign in to let Otto help you prepare.");
  });

  it("makes a demo pack, saves it on the application and counts one letter", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    const res = await POST(jsonRequest("/api/interview", body(id)));
    expect(res.status).toBe(200);
    const json = (await res.json()) as InterviewResponse;
    expect(json.demo).toBe(true);
    expect(json.result.saved).toBe(true);
    expect(json.result.prep.version).toBe(2);
    expect(json.result.prep.questions[0]?.round).toBe("opening");
    expect(json.result.prep.questions.at(-1)?.round).toBe("closing");
    expect(json.result.prep.stories[0]?.place).toBe("Product Marketing Manager at Brightloop");
    expect(json.usage.letter).toEqual({ used: 1, limit: PRO_TRIAL.limits.letter });
    expect((await getUsage(user)).letter.used).toBe(1);

    const loaded = await prepRequest(id);
    expect(loaded.status).toBe(200);
    expect(loaded.headers.get("Cache-Control")).toBe("no-store");
    const stored = (await loaded.json()) as InterviewPrepResponse;
    expect(stored.target).toMatchObject({ id, company: "Contoso", jobUrl: "https://example.com/jobs/1" });
    expect(stored.prep).toEqual(json.result.prep);
  });

  it("asks Supabase who's calling once, though it saves the pack after the AI answers", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    const getUser = vi.spyOn(fakeAuth.server, "getUser");
    const res = await POST(jsonRequest("/api/interview", body(id)));
    expect(((await res.json()) as InterviewResponse).result.saved).toBe(true);
    expect(getUser).toHaveBeenCalledOnce();
    getUser.mockRestore();
  });

  it("still hands over the pack when the application is gone", async () => {
    await signInOnTrial(undefined, TRIAL_END);
    const res = await POST(jsonRequest("/api/interview", body(crypto.randomUUID())));
    expect(res.status).toBe(200);
    expect(((await res.json()) as InterviewResponse).result.saved).toBe(false);
  });

  it("rejects a post that's too short without spending a letter", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    const res = await POST(
      jsonRequest("/api/interview", { ...body(id), job: { text: "Apply now.", title: "", company: "" } }),
    );
    expect(res.status).toBe(400);
    expect((await getUsage(user)).letter.used).toBe(0);
  });
});

describe("GET /api/interview/:id", () => {
  it("needs a signed-in user", async () => {
    const res = await prepRequest(crypto.randomUUID());
    expect(res.status).toBe(401);
  });

  it("answers 404 for another account's application and for a bad id", async () => {
    const owner = await signInOnTrial("owner@example.com", TRIAL_END);
    const id = await newApplication(owner.id);
    cookieJar.clear();
    await signInOnTrial("other@example.com", TRIAL_END);
    expect((await prepRequest(id)).status).toBe(404);
    expect((await prepRequest("not-a-uuid")).status).toBe(404);
  });

  it("returns no pack before one is made", async () => {
    const user = await signInOnTrial(undefined, TRIAL_END);
    const id = await newApplication(user.id);
    const res = await prepRequest(id);
    expect(((await res.json()) as InterviewPrepResponse).prep).toBeNull();
  });
});

describe("prep store", () => {
  it("never writes another account's row and reads a broken pack as none", async () => {
    const owner = await signInOnTrial("owner@example.com", TRIAL_END);
    const id = await newApplication(owner.id);
    const pack: InterviewPrep = {
      version: 2,
      job: { title: "", company: "" },
      questions: [],
      stories: [],
      asks: [],
      createdAt: NOW,
      demo: true,
    };
    expect(await savePrep(crypto.randomUUID(), id, pack)).toBe(false);
    expect(await savePrep(owner.id, id, pack)).toBe(true);
    expect((await getPrep(owner.id, id))?.prep).toEqual(pack);
    await expect(savePrep(owner.id, id, { ...pack, asks: ["x".repeat(500)] })).rejects.toThrow();
  });

  it("reads a pack saved before rounds as v2, and lists it", async () => {
    const owner = await signInOnTrial("owner@example.com", TRIAL_END);
    const id = await newApplication(owner.id);
    const v1 = {
      version: 1,
      job: { title: "", company: "" },
      questions: [{ question: "Tell me about a launch.", why: "The post asks for launches." }],
      stories: [],
      asks: [],
      createdAt: NOW,
      demo: false,
    };
    const db = await getDb();
    await db
      .update(applications)
      .set({ prep: v1 as unknown as InterviewPrep })
      .where(eq(applications.id, id));

    const res = await prepRequest(id);
    expect(res.status).toBe(200);
    const { prep } = (await res.json()) as InterviewPrepResponse;
    expect(prep?.version).toBe(2);
    expect(prep?.questions).toEqual([
      {
        round: "fit",
        question: "Tell me about a launch.",
        checking: "The post asks for launches.",
        followUp: "",
        points: [],
        story: null,
      },
    ]);
    const { packs } = (await (await listPacks()).json()) as InterviewPacksResponse;
    expect(packs).toEqual([expect.objectContaining({ applicationId: id, questions: 1 })]);
  });
});

describe("GET /api/interview", () => {
  it("lists the account's packs as counts, newest first, on any plan", async () => {
    expect((await listPacks()).status).toBe(401);
    const owner = await signInOnTrial("owner@example.com", TRIAL_END);
    const older = await newApplication(owner.id);
    const newer = await newApplication(owner.id);
    await newApplication(owner.id);
    const pack: InterviewPrep = {
      version: 2,
      job: { title: "", company: "" },
      questions: [
        { round: "behavioural", question: "Tell me about a launch.", checking: "", followUp: "", points: [], story: null },
      ],
      stories: [],
      asks: [],
      createdAt: NOW - 5_000,
      demo: true,
    };
    await savePrep(owner.id, older, pack);
    await savePrep(owner.id, newer, { ...pack, createdAt: NOW, demo: false, questions: [] });

    const res = await listPacks();
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { packs } = (await res.json()) as InterviewPacksResponse;
    expect(packs).toEqual([
      expect.objectContaining({ applicationId: newer, createdAt: NOW, questions: 0, stories: 0, demo: false }),
      expect.objectContaining({ applicationId: older, company: "Contoso", questions: 1, demo: true }),
    ]);

    cookieJar.clear();
    await signInAs("free@example.com");
    expect(((await (await listPacks()).json()) as InterviewPacksResponse).packs).toEqual([]);
  });
});
