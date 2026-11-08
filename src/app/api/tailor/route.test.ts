import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLANS } from "@/config/plans";
import { tailorResume } from "@/lib/ai/tailor";
import { AIError, type TailorResult } from "@/lib/ai/types";
import type { ApiErrorBody, TailorRequestBody, TailorResponse } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, signInAs } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { createSampleResume } from "@/lib/resume/sample";
import { consumeUsage, getUsage } from "@/lib/usage";

import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/tailor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/tailor")>();
  return { ...actual, tailorResume: vi.fn(actual.tailorResume) };
});

const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);

const JOB_POST =
  "We're hiring a Senior Product Marketing Manager to lead launches for our B2B analytics suite. " +
  "You will own positioning, messaging and sales enablement, run customer research, and work " +
  "closely with product and sales. Must have: B2B SaaS experience, SQL, HubSpot, A/B testing. " +
  "Nice to have: Figma and experience with usage-based pricing.";

function body(overrides: Partial<TailorRequestBody["job"]> = {}): TailorRequestBody {
  return {
    resume: createSampleResume(NOW),
    job: { text: JOB_POST, title: "Senior Product Marketing Manager", company: "Contoso", ...overrides },
  };
}

const tailor = (payload: unknown = body()) => POST(jsonRequest("/api/tailor", payload));

async function signIn(email = "ada@example.com"): Promise<SessionUser> {
  const user = await signInAs(email);
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
    expect(await errorOf(res)).toEqual({ code: "unauthorized", message: "Sign in to let Otto tailor your resume." });
  });

  it("returns the demo tailoring and counts one tailored version", async () => {
    const user = await signIn();
    const res = await tailor();
    expect(res.status).toBe(200);
    const result = (await res.json()) as TailorResponse;

    expect(result.ok).toBe(true);
    expect(result.result.job).toEqual({ title: "Senior Product Marketing Manager", company: "Contoso" });
    expect(result.result.keywords.length).toBeGreaterThan(0);
    expect(result.result.requirements.length).toBeGreaterThan(0);
    expect(result.result.requirements.every((item) => item.id.startsWith("r"))).toBe(true);
    expect(Array.isArray(result.result.bulletOrder)).toBe(true);
    expect(result.usage.tailor).toEqual({ used: 1, limit: PLANS.free.limits.tailor });
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

  it("answers 429 limit_reached after the free tailored versions", async () => {
    const user = await signIn();
    for (let i = 0; i < PLANS.free.limits.tailor; i++) await consumeUsage(user, "tailor");
    const res = await tailor();
    expect(res.status).toBe(429);
    expect(await errorOf(res)).toEqual({
      code: "limit_reached",
      message: "You've used this month's 3 tailored versions. Pro has 60 a month.",
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
});
