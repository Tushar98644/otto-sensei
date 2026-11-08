import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLANS } from "@/config/plans";
import { writeSummary } from "@/lib/ai/summary";
import { AIError } from "@/lib/ai/types";
import type { ApiErrorBody, SummaryRequestBody, SummaryResponse } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { createSampleResume } from "@/lib/resume/sample";
import { getUsage } from "@/lib/usage";

import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/summary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/summary")>();
  return { ...actual, writeSummary: vi.fn(actual.writeSummary) };
});

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
    const user = await signInAs("ada@example.com");
    const res = await send(write());
    expect(res.status).toBe(200);
    const body = (await res.json()) as SummaryResponse;

    expect(body.demo).toBe(true);
    expect(body.result.options.map((option) => option.kind)).toEqual(["achievements", "role"]);
    expect(body.usage.fix).toEqual({ used: 1, limit: PLANS.free.limits.fix });
    expect((await getUsage(user, NOW)).fix.used).toBe(1);
  });

  it("tightens the person's own summary", async () => {
    await signInAs("ada@example.com");
    const res = await send({ mode: "improve", summary: "I am a very hard-working designer. Ships fast." });
    expect(res.status).toBe(200);
    const body = (await res.json()) as SummaryResponse;
    expect(body.result.options).toEqual([
      { kind: "tightened", text: "Designer. Ships fast.", warnings: [] },
    ]);
  });

  it("rejects a summary too short to improve before counting anything", async () => {
    const user = await signInAs("ada@example.com");
    const res = await send({ mode: "improve", summary: "Hi" });
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("bad_request");
    expect((await getUsage(user, NOW)).fix.used).toBe(0);
  });

  it("rejects an unknown mode", async () => {
    await signInAs("ada@example.com");
    const res = await send({ mode: "rewrite", summary: "Backend engineer building APIs." });
    expect(res.status).toBe(400);
  });

  it("gives the unit back when the model fails", async () => {
    const user = await signInAs("ada@example.com");
    vi.mocked(writeSummary).mockRejectedValueOnce(new AIError("unavailable", "down"));
    const res = await send(write());
    expect(res.status).toBe(502);
    expect((await errorOf(res)).code).toBe("ai_unavailable");
    expect((await getUsage(user, NOW)).fix.used).toBe(0);
  });
});
