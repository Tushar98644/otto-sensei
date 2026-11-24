import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { listings } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { resetDb } from "@/lib/auth/test-helpers";
import type { CronResponse } from "@/lib/cron/run";
import { resetEnvForTests } from "@/lib/env";
import { boardUrl, HOST_SPACING_MS } from "@/lib/job-feed/ingest";
import { GREENHOUSE_BOARD } from "@/lib/job-feed/test-fixtures";
import { fakeNet } from "@/lib/jobs/test-network";
import { GET, POST } from "./route";

vi.mock("node:dns", async (importOriginal) =>
  (await import("@/lib/jobs/test-network")).dnsMock(await importOriginal()),
);
vi.mock(
  "@/lib/jobs/transport",
  async () => (await import("@/lib/jobs/test-network")).transportMock,
);
vi.mock("@/lib/job-feed/seeds", () => ({
  BOARD_SEEDS: [{ ats: "greenhouse", token: "vercel", company: "Vercel" }],
}));

const SECRET = "cron-secret-for-tests-0123456789";

function call(authorization?: string, method = "GET") {
  return new Request("http://localhost/api/cron/jobs", {
    method,
    headers: authorization === undefined ? {} : { authorization },
  });
}

describe("/api/cron/jobs", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.CRON_SECRET = SECRET;
    resetEnvForTests();
    for (const host of Object.keys(HOST_SPACING_MS)) HOST_SPACING_MS[host] = 0;
    fakeNet.reset();
    fakeNet.resolve("boards-api.greenhouse.io", "93.184.216.34");
    fakeNet.json(boardUrl("greenhouse", "vercel").toString(), GREENHOUSE_BOARD);
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    resetEnvForTests();
  });

  it("refuses calls without the exact secret, and reads nothing", async () => {
    for (const authorization of [undefined, "", `Bearer ${SECRET}x`, SECRET]) {
      const res = await GET(call(authorization));
      expect(res.status).toBe(401);
      expect(((await res.json()) as ApiErrorBody).error.code).toBe("unauthorized");
    }
    delete process.env.CRON_SECRET;
    resetEnvForTests();
    expect((await GET(call("Bearer "))).status).toBe(401);
    expect(fakeNet.requests).toHaveLength(0);
  });

  it("runs the ingest for Vercel Cron (GET) and manual calls (POST)", async () => {
    const res = await GET(call(`Bearer ${SECRET}`));
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await (await getDb()).select({ id: listings.id }).from(listings)).toHaveLength(2);

    const before = fakeNet.requests.length;
    const again = await POST(call(`Bearer ${SECRET}`, "POST"));
    expect(again.status).toBe(200);
    const body = (await again.json()) as CronResponse;
    expect(body).toMatchObject({
      ok: true,
      job: "jobs",
      complete: true,
      stats: { feeds: 0, boards: 0 },
    });
    expect(fakeNet.requests.length).toBe(before);
  });
});
