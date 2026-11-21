import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TOKEN_BUDGETS, PLANS, PRO_TRIAL } from "@/config/plans";
import { getDb } from "@/db/client";
import { usage } from "@/db/schema";
import { writeSummary } from "@/lib/ai/summary";
import { AIError } from "@/lib/ai/types";
import type { ApiErrorBody, SummaryRequestBody, SummaryResponse, SummaryResult } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, setPlan, signInAs, signInOnTrial } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume } from "@/lib/resume/schema";
import { AI_TOKENS, getUsage, TRIAL_PERIOD_KEY } from "@/lib/usage";

import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/summary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/summary")>();
  return { ...actual, writeSummary: vi.fn(actual.writeSummary) };
});

const TRIAL_END = Date.UTC(2099, 0, 15, 12);
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);

const write = (): SummaryRequestBody => ({ mode: "write", resume: createSampleResume(NOW) });
const send = (body: unknown) => POST(jsonRequest("/api/summary", body));

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

beforeEach(async () => {
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
  delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("POST /api/summary", () => {
  it("needs a signed-in user", async () => {
    const res = await send(write());
    expect(res.status).toBe(401);
    expect((await errorOf(res)).message).toBe("Sign in to let Otto help with your summary.");
  });

  it("writes two demo takes and counts one line fix", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const res = await send(write());
    expect(res.status).toBe(200);
    const body = (await res.json()) as SummaryResponse;

    expect(body.demo).toBe(true);
    expect(body.result.options.map((option) => option.kind)).toEqual(["achievements", "role"]);
    expect(body.usage.fix).toEqual({ used: 1, limit: PRO_TRIAL.limits.fix });
    expect((await getUsage(user, NOW)).fix.used).toBe(1);
  });

  it("tightens the person's own summary", async () => {
    await signInOnTrial("ada@example.com", TRIAL_END);
    const res = await send({ mode: "improve", summary: "I am a very hard-working designer. Ships fast." });
    expect(res.status).toBe(200);
    const body = (await res.json()) as SummaryResponse;
    expect(body.result.options).toEqual([
      { kind: "tightened", text: "Designer. Ships fast.", warnings: [] },
    ]);
  });

  it("rejects a summary too short to improve before counting anything", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const res = await send({ mode: "improve", summary: "Hi" });
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("bad_request");
    expect((await getUsage(user, NOW)).fix.used).toBe(0);
  });

  it("rejects an unknown mode", async () => {
    await signInOnTrial("ada@example.com", TRIAL_END);
    const res = await send({ mode: "rewrite", summary: "Backend engineer building APIs." });
    expect(res.status).toBe(400);
  });

  it("gives the unit back when the model fails", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    vi.mocked(writeSummary).mockRejectedValueOnce(new AIError("unavailable", "down"));
    const res = await send(write());
    expect(res.status).toBe(502);
    expect((await errorOf(res)).code).toBe("ai_unavailable");
    expect((await getUsage(user, NOW)).fix.used).toBe(0);
  });
});

describe("POST /api/summary guards and failures", () => {
  const INVALID = "Otto couldn't read that. Write a sentence or two first, or add a job to your resume.";
  const TOO_LONG = "That resume is too long for Otto. Trim it a little and try again.";
  const CROSS_SITE: Record<string, string>[] = [{ "sec-fetch-site": "cross-site" }, { origin: "https://evil.example" }];

  const fixesUsed = async (user: SessionUser) => (await getUsage(user, NOW)).fix.used;
  const writes = () => vi.mocked(writeSummary).mock.calls.length;

  function longResume(): Resume {
    const resume = createSampleResume(NOW);
    const job = resume.experience[0]!;
    const experience = [0, 1].map((n) => ({
      ...job,
      id: `long-job-${n}`,
      bullets: Array.from({ length: 40 }, (_, i) => ({
        id: `long-${n}-${i}`,
        text: `Launch ${n}-${i}: ${"ran the campaign from brief to results. ".repeat(24)}`.slice(0, 1_000),
      })),
    }));
    return { ...resume, experience };
  }

  afterEach(() => vi.unstubAllGlobals());

  it("refuses a request sent from another website without counting anything", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const before = writes();
    for (const headers of CROSS_SITE) {
      const req = jsonRequest("/api/summary", write());
      for (const [name, value] of Object.entries(headers)) req.headers.set(name, value);
      const res = await POST(req);
      expect(res.status).toBe(403);
      expect((await errorOf(res)).code).toBe("forbidden");
    }
    expect(writes()).toBe(before);
    expect(await fixesUsed(user)).toBe(0);
  });

  it("refuses bodies that aren't JSON, and says what Otto needs when it can't read one", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const plain = await POST(jsonRequest("/api/summary", write(), { contentType: "text/plain" }));
    expect(plain.status).toBe(415);

    const broken = await POST(
      new Request("http://localhost/api/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{\"mode\":\"write\",",
      }),
    );
    expect(broken.status).toBe(400);
    expect(await errorOf(broken)).toEqual({ code: "bad_request", message: INVALID });

    const noResume = await send({ mode: "write" });
    expect(await errorOf(noResume)).toEqual({ code: "bad_request", message: INVALID });
    expect(await fixesUsed(user)).toBe(0);
  });

  it("puts a refusal or an oversized input in the summary's own words and gives the fix back", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);

    vi.mocked(writeSummary).mockRejectedValueOnce(new AIError("refused", "declined"));
    const refused = await send(write());
    expect(refused.status).toBe(422);
    expect(await errorOf(refused)).toEqual({
      code: "ai_refused",
      message: "Otto can't help with that summary. Try rewording it.",
    });

    vi.mocked(writeSummary).mockRejectedValueOnce(new AIError("too_long", "too long"));
    const tooLong = await send(write());
    expect(tooLong.status).toBe(400);
    expect(await errorOf(tooLong)).toEqual({ code: "bad_request", message: TOO_LONG });

    expect(await fixesUsed(user)).toBe(0);
  });

  it("turns down a resume too long to summarize without counting a fix", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const res = await send({ mode: "write", resume: longResume() });
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toEqual({ code: "bad_request", message: TOO_LONG });
    expect(await fixesUsed(user)).toBe(0);
  });

  it("answers 500 without the cause and gives the fix back when something unexpected breaks", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    vi.mocked(writeSummary).mockRejectedValueOnce(new Error("connection reset by peer"));
    const res = await send(write());
    expect(res.status).toBe(500);
    expect(await errorOf(res)).toEqual({ code: "server_error", message: "Something went wrong. Please try again." });
    expect(await fixesUsed(user)).toBe(0);
  });

  it("stops at the AI budget before counting a fix or writing anything", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    await (await getDb())
      .insert(usage)
      .values({ subject: user.id, feature: AI_TOKENS, period: TRIAL_PERIOD_KEY, count: AI_TOKEN_BUDGETS.trial });
    const before = writes();

    const res = await send(write());
    expect(res.status).toBe(429);
    expect(await errorOf(res)).toEqual({
      code: "limit_reached",
      message: "You've used this trial's AI budget. Your full allowance starts on Jan 15.",
      reason: "ai_budget",
    });
    expect(writes()).toBe(before);
    expect(await fixesUsed(user)).toBe(0);
  });

  it("hands the trimmed summary over and marks a summary from the AI as real, on Pro's allowance", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("no network in tests");
      }),
    );
    resetEnvForTests();
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    const result: SummaryResult = {
      options: [{ kind: "tightened", text: "Designer who ships fast.", warnings: [] }],
    };
    vi.mocked(writeSummary).mockResolvedValueOnce(result);

    const res = await send({ mode: "improve", summary: "   I am a designer who ships fast.  " });
    expect(res.status).toBe(200);
    const json = (await res.json()) as SummaryResponse;
    expect(json).toMatchObject({ demo: false, result });
    expect(json.usage.fix).toEqual({ used: 1, limit: PLANS.pro.limits.fix });
    expect(vi.mocked(writeSummary).mock.lastCall?.[0]).toEqual({
      mode: "improve",
      summary: "I am a designer who ships fast.",
    });
    expect(await fixesUsed(user)).toBe(1);
  });

  it("shares the line-fix burst limit: 30 a minute, then 429 without counting", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const improve = { mode: "improve", summary: "Backend engineer building payment APIs." };
    for (let i = 0; i < 30; i++) expect((await send(improve)).status).toBe(200);

    const res = await send(improve);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect((await errorOf(res)).code).toBe("rate_limited");
    expect(await fixesUsed(user)).toBe(30);
  });
});
