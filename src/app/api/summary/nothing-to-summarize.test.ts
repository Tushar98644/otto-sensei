import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRO_TRIAL } from "@/config/plans";
import { writeSummary } from "@/lib/ai/summary";
import type { SummaryResponse } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, signInOnTrial } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { emptyResume } from "@/lib/resume/schema";
import { getUsage } from "@/lib/usage";

import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/summary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/summary")>();
  return { ...actual, writeSummary: vi.fn(actual.writeSummary) };
});

const TRIAL_END = Date.UTC(2099, 0, 15, 12);
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0, 7);

beforeEach(async () => {
  vi.setSystemTime(NOW);
  await resetDb();
  cookieJar.clear();
  delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
});

afterEach(() => {
  vi.useRealTimers();
  resetEnvForTests();
});

describe("POST /api/summary write mode with nothing to summarize", () => {
  it("answers with no takes and counts no line fix", async () => {
    const user = await signInOnTrial("ada@example.com", TRIAL_END);
    const calls = vi.mocked(writeSummary).mock.calls.length;
    const blank = { ...emptyResume(NOW), basics: { ...emptyResume(NOW).basics, headline: "   " } };

    const res = await POST(jsonRequest("/api/summary", { mode: "write", resume: blank }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as SummaryResponse;
    expect(body.result).toEqual({ options: [] });
    expect(body.usage.fix).toEqual({ used: 0, limit: PRO_TRIAL.limits.fix });

    expect(vi.mocked(writeSummary).mock.calls).toHaveLength(calls);
    expect((await getUsage(user, NOW)).fix.used).toBe(0);
  });
});
