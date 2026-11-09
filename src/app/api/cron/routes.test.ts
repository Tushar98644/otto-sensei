import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { applications, notifications, rateLimits } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import type { CronResponse } from "@/lib/cron/run";
import { resetEnvForTests } from "@/lib/env";
import { GET as cleanup, POST as cleanupPost } from "./cleanup/route";
import { GET as followUps } from "./follow-ups/route";

const SECRET = "cron-secret-for-tests-0123456789";
const DAY = 24 * 60 * 60 * 1_000;

function call(path: string, authorization?: string) {
  return new Request(`http://localhost${path}`, {
    headers: authorization === undefined ? {} : { authorization },
  });
}

describe("/api/cron/*", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.CRON_SECRET = SECRET;
    resetEnvForTests();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    resetEnvForTests();
  });

  it("refuses calls without the exact secret", async () => {
    for (const authorization of [undefined, "", `Bearer ${SECRET}x`, SECRET, `Basic ${SECRET}`]) {
      const res = await cleanup(call("/api/cron/cleanup", authorization));
      expect(res.status).toBe(401);
      expect(((await res.json()) as ApiErrorBody).error.code).toBe("unauthorized");
    }
  });

  it("refuses every call when no secret, or too short a one, is configured", async () => {
    delete process.env.CRON_SECRET;
    resetEnvForTests();
    expect((await cleanup(call("/api/cron/cleanup", "Bearer "))).status).toBe(401);

    process.env.CRON_SECRET = "short";
    resetEnvForTests();
    expect((await cleanup(call("/api/cron/cleanup", "Bearer short"))).status).toBe(401);
  });

  it("runs the cleanup for Vercel Cron (GET) and manual calls (POST)", async () => {
    const db = await getDb();
    await db.insert(rateLimits).values({ key: "import:ip:old", windowStart: Date.now() - 3 * DAY, count: 1 });

    const res = await cleanup(call("/api/cron/cleanup", `Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as CronResponse;
    expect(body).toMatchObject({ ok: true, job: "cleanup", complete: true, stats: { rateLimits: 1 } });

    const again = await cleanupPost(
      new Request("http://localhost/api/cron/cleanup", {
        method: "POST",
        headers: { authorization: `Bearer ${SECRET}` },
      }),
    );
    expect(((await again.json()) as CronResponse).stats.rateLimits).toBe(0);
  });

  it("runs the follow-ups in-app only when email isn't set up", async () => {
    // Reminders are part of the tracker, which is Pro.
    const maya = await setPlan(await createUser("maya@example.com"), "pro");
    const sent = Date.now() - 30 * DAY;
    await (await getDb()).insert(applications).values({
      id: crypto.randomUUID(),
      userId: maya.id,
      company: "Stripe",
      appliedAt: sent,
      statusChangedAt: sent,
      followUpAt: sent + 7 * DAY,
      createdAt: sent,
      updatedAt: sent,
    });

    const res = await followUps(call("/api/cron/follow-ups", `Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as CronResponse;
    expect(body).toMatchObject({
      job: "follow_ups",
      stats: { users: 1, applications: 1, emailsSent: 0, emailsSkipped: 1 },
    });
    expect(await (await getDb()).select().from(notifications)).toHaveLength(1);
  });
});
