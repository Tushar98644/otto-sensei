import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLANS } from "@/config/plans";
import type {
  ApiErrorBody,
  InterviewPrepResponse,
  InterviewRequestBody,
  InterviewResponse,
} from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { getPrep, savePrep } from "@/lib/insights/prep-store";
import { createSampleResume } from "@/lib/resume/sample";
import { getUsage } from "@/lib/usage";
import { createApplication } from "../applications/records";
import { GET } from "./[id]/route";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

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
    const user = await signInAs();
    const id = await newApplication(user.id);
    const res = await POST(jsonRequest("/api/interview", body(id)));
    expect(res.status).toBe(200);
    const json = (await res.json()) as InterviewResponse;
    expect(json.demo).toBe(true);
    expect(json.result.saved).toBe(true);
    expect(json.result.prep.questions.length).toBeGreaterThan(0);
    expect(json.result.prep.stories[0]?.place).toBe("Product Marketing Manager at Brightloop");
    expect(json.usage.letter).toEqual({ used: 1, limit: PLANS.free.limits.letter });
    expect((await getUsage(user)).letter.used).toBe(1);

    const loaded = await prepRequest(id);
    expect(loaded.status).toBe(200);
    expect(loaded.headers.get("Cache-Control")).toBe("no-store");
    const stored = (await loaded.json()) as InterviewPrepResponse;
    expect(stored.target).toMatchObject({ id, company: "Contoso", jobUrl: "https://example.com/jobs/1" });
    expect(stored.prep).toEqual(json.result.prep);
  });

  it("still hands over the pack when the application is gone", async () => {
    await signInAs();
    const res = await POST(jsonRequest("/api/interview", body(crypto.randomUUID())));
    expect(res.status).toBe(200);
    expect(((await res.json()) as InterviewResponse).result.saved).toBe(false);
  });

  it("rejects a post that's too short without spending a letter", async () => {
    const user = await signInAs();
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
    const owner = await signInAs("owner@example.com");
    const id = await newApplication(owner.id);
    cookieJar.clear();
    await signInAs("other@example.com");
    expect((await prepRequest(id)).status).toBe(404);
    expect((await prepRequest("not-a-uuid")).status).toBe(404);
  });

  it("returns no pack before one is made", async () => {
    const user = await signInAs();
    const id = await newApplication(user.id);
    const res = await prepRequest(id);
    expect(((await res.json()) as InterviewPrepResponse).prep).toBeNull();
  });
});

describe("prep store", () => {
  it("never writes another account's row and reads a broken pack as none", async () => {
    const owner = await signInAs("owner@example.com");
    const id = await newApplication(owner.id);
    const pack = {
      version: 1 as const,
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
});
