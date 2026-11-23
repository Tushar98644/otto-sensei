import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRO_TRIAL } from "@/config/plans";
import { tailorResume } from "@/lib/ai/tailor";
import { AIError, type TailorResult } from "@/lib/ai/types";
import type { ApiErrorBody, TailorRequestBody, TailorResponse } from "@/lib/api/types";
import { getDb } from "@/db/client";
import { meteredCalls, usage } from "@/db/schema";
import { REQUEST_ID_HEADER, RESULT_TTL_MS, RESUME_HEADER } from "@/lib/api/request-id";
import { cookieJar, jsonRequest, resetDb, signInAs, signInOnTrial } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { createSampleResume } from "@/lib/resume/sample";
import { consumeUsage, getUsage, monthKey } from "@/lib/usage";

import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/tailor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/tailor")>();
  return { ...actual, tailorResume: vi.fn(actual.tailorResume) };
});

const TRIAL_END = Date.UTC(2099, 0, 15, 12);
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);

const JOB_POST =
  "We're hiring a Senior Product Marketing Manager to lead launches for our B2B analytics suite. " +
  "You will own positioning, messaging and sales enablement, run customer research, and work " +
  "closely with product and sales. Must have: B2B SaaS experience, SQL, HubSpot, A/B testing. " +
  "Nice to have: Figma and experience with usage-based pricing.";

function body(overrides: Partial<TailorRequestBody["job"]> = {}): TailorRequestBody {
  return {
    resume: createSampleResume(NOW),
    job: {
      text: JOB_POST,
      title: "Senior Product Marketing Manager",
      company: "Contoso",
      ...overrides,
    },
  };
}

const tailor = (payload: unknown = body()) => POST(jsonRequest("/api/tailor", payload));

const REQUEST_ID = "6f1d0c3a-2b4e-4f5a-8c9d-0e1f2a3b4c5d";
const SENT = body();
const OTHER_JOB: TailorRequestBody = { ...SENT, job: { ...SENT.job, company: "Northwind" } };

function tailorWithId(payload: TailorRequestBody = SENT, id = REQUEST_ID): Promise<Response> {
  const req = jsonRequest("/api/tailor", payload);
  req.headers.set(REQUEST_ID_HEADER, id);
  return POST(req);
}

function resumeRun(
  payload: TailorRequestBody = SENT,
  id: string | null = REQUEST_ID,
): Promise<Response> {
  const req = jsonRequest("/api/tailor", payload);
  if (id) req.headers.set(REQUEST_ID_HEADER, id);
  req.headers.set(RESUME_HEADER, "1");
  return POST(req);
}

async function signIn(email = "ada@example.com"): Promise<SessionUser> {
  const user = await signInOnTrial(email, TRIAL_END);
  return user;
}

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
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("POST /api/tailor", () => {
  it("needs a signed-in user", async () => {
    const res = await tailor();
    expect(res.status).toBe(401);
    expect(await errorOf(res)).toEqual({
      code: "unauthorized",
      message: "Sign in to let Otto tailor your resume.",
    });
  });

  it("returns the demo tailoring and counts one tailored version", async () => {
    const user = await signIn();
    const res = await tailor();
    expect(res.status).toBe(200);
    const result = (await res.json()) as TailorResponse;

    expect(result.ok).toBe(true);
    expect(result.result.job).toEqual({
      title: "Senior Product Marketing Manager",
      company: "Contoso",
    });
    expect(result.result.keywords.length).toBeGreaterThan(0);
    expect(result.result.requirements.length).toBeGreaterThan(0);
    expect(result.result.requirements.every((item) => item.id.startsWith("r"))).toBe(true);
    expect(Array.isArray(result.result.bulletOrder)).toBe(true);
    expect(result.usage.tailor).toEqual({ used: 1, limit: PRO_TRIAL.limits.tailor });
    expect(result.usage.fix.used).toBe(0);
    expect(result.demo).toBe(true);
    expect((await getUsage(user)).tailor.used).toBe(1);
  });

  it("marks the result as real, not demo, when an AI key is set", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    resetEnvForTests();
    await signIn();
    const real: TailorResult = {
      job: { title: "Senior Product Marketing Manager", company: "Contoso" },
      requirements: [
        {
          id: "r1",
          text: "HubSpot",
          importance: "must",
          source: "structure",
          terms: ["HubSpot"],
          quote: "",
          ask: "Have you used HubSpot?",
        },
      ],
      keywords: [{ term: "HubSpot", importance: "must", inResume: true, evidence: "HubSpot" }],
      askUser: [],
      bulletOrder: [],
      summary: "",
      notes: [],
    };
    vi.mocked(tailorResume).mockResolvedValueOnce(real);

    const result = (await (await tailor()).json()) as TailorResponse;
    expect(result.result).toEqual(real);
    expect(result.demo).toBe(false);
  });

  it("rejects a job post that's too short without spending a tailor", async () => {
    const user = await signIn();
    const res = await tailor(body({ text: "Marketing role, apply now." }));
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("bad_request");
    expect((await getUsage(user)).tailor.used).toBe(0);
  });

  it("answers 429 limit_reached after the trial's tailored versions", async () => {
    const user = await signIn();
    for (let i = 0; i < PRO_TRIAL.limits.tailor; i++) await consumeUsage(user, "tailor");
    const res = await tailor();
    expect(res.status).toBe(429);
    expect(await errorOf(res)).toEqual({
      code: "limit_reached",
      message:
        "You've used this trial's 10 tailored versions. Pro has 150 a month. Your full allowance starts on Jan 15.",
    });
  });

  it("gives the tailor back when the AI call fails", async () => {
    const user = await signIn();
    vi.mocked(tailorResume).mockRejectedValueOnce(new AIError("refused", "declined"));
    const refused = await tailor();
    expect(refused.status).toBe(422);
    expect((await errorOf(refused)).code).toBe("ai_refused");

    vi.mocked(tailorResume).mockRejectedValueOnce(new AIError("invalid_output", "bad shape"));
    expect((await tailor()).status).toBe(502);

    expect((await getUsage(user)).tailor.used).toBe(0);
  });

  it("points Free to Pro even with invite extras, which wait for the trial or an upgrade", async () => {
    const user = await signInAs("free@example.com");
    const db = await getDb();
    await db
      .insert(usage)
      .values({ subject: user.id, feature: "tailor", period: monthKey(NOW), bonus: 2 });
    const calls = vi.mocked(tailorResume).mock.calls.length;
    const res = await tailor();
    expect(res.status).toBe(402);
    expect((await errorOf(res)).code).toBe("upgrade_required");
    expect(vi.mocked(tailorResume).mock.calls).toHaveLength(calls);
    expect((await getUsage(user)).tailor).toEqual({ used: 0, limit: 0 });
  });
});

describe("POST /api/tailor after a reload", () => {
  it("hands back the paid result for the same request id without charging or calling the AI again", async () => {
    const user = await signIn();
    const first = (await (await tailorWithId()).json()) as TailorResponse;
    expect(first.usage.tailor.used).toBe(1);
    const calls = vi.mocked(tailorResume).mock.calls.length;

    const again = await tailorWithId();
    expect(again.status).toBe(200);
    const replayed = (await again.json()) as TailorResponse;
    expect(replayed.result).toEqual(first.result);
    expect(replayed.demo).toBe(first.demo);
    expect(replayed.usage.tailor.used).toBe(1);
    expect(vi.mocked(tailorResume).mock.calls).toHaveLength(calls);
    expect((await getUsage(user)).tailor.used).toBe(1);
  });

  it("runs and charges a new id, another job under the same id, and the same id after ten minutes", async () => {
    const user = await signIn();
    await tailorWithId();
    await tailorWithId(SENT, "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d");
    await tailorWithId(OTHER_JOB);
    expect((await getUsage(user)).tailor.used).toBe(3);

    vi.setSystemTime(NOW + RESULT_TTL_MS + 1);
    await tailorWithId();
    expect((await getUsage(user)).tailor.used).toBe(4);
  });

  it("never hands one account's result to another", async () => {
    await signIn("ada@example.com");
    await tailorWithId();
    const bob = await signIn("bob@example.com");
    const calls = vi.mocked(tailorResume).mock.calls.length;
    expect((await tailorWithId()).status).toBe(200);
    expect(vi.mocked(tailorResume).mock.calls).toHaveLength(calls + 1);
    expect((await getUsage(bob)).tailor.used).toBe(1);
  });

  it("keeps nothing for a failed or refused run, so the same id runs again", async () => {
    const user = await signIn();
    vi.mocked(tailorResume).mockRejectedValueOnce(new AIError("unavailable", "timed out"));
    expect((await tailorWithId()).status).toBe(502);
    expect(await (await getDb()).select().from(meteredCalls)).toEqual([]);

    expect((await tailorWithId()).status).toBe(200);
    expect((await getUsage(user)).tailor.used).toBe(1);

    for (let i = 1; i < PRO_TRIAL.limits.tailor; i++) await consumeUsage(user, "tailor");
    expect((await tailorWithId(OTHER_JOB)).status).toBe(429);
    expect(await (await getDb()).select().from(meteredCalls)).toHaveLength(1);
  });

  it("picks up a paid run after a reload without charging, and never starts one", async () => {
    const user = await signIn();
    const first = (await (await tailorWithId()).json()) as TailorResponse;
    const calls = vi.mocked(tailorResume).mock.calls.length;

    const picked = await resumeRun();
    expect(picked.status).toBe(200);
    expect(((await picked.json()) as TailorResponse).result).toEqual(first.result);

    for (const res of [
      await resumeRun(OTHER_JOB),
      await resumeRun(SENT, "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"),
      await resumeRun(SENT, null),
    ]) {
      expect(res.status).toBe(404);
      expect((await errorOf(res)).code).toBe("not_found");
    }
    expect(vi.mocked(tailorResume).mock.calls).toHaveLength(calls);
    expect((await getUsage(user)).tailor.used).toBe(1);
    expect(await (await getDb()).select().from(meteredCalls)).toHaveLength(1);
  });
});
