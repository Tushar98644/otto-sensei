import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { notifications, trialReminders } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import type { CronResponse } from "@/lib/cron/run";
import { resetEnvForTests } from "@/lib/env";
import { GET, POST } from "./route";

const SECRET = "cron-secret-for-tests-0123456789";
const HOUR = 60 * 60 * 1_000;

function call(authorization?: string, method = "GET") {
  return new Request("http://localhost/api/cron/trial-reminders", {
    method,
    headers: authorization === undefined ? {} : { authorization },
  });
}

async function trialEndingTomorrow() {
  await setPlan(await createUser("maya@example.com"), "trial", Date.now() + 26 * HOUR);
}

describe("/api/cron/trial-reminders", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.CRON_SECRET = SECRET;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    resetEnvForTests();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    resetEnvForTests();
  });

  it("refuses calls without the exact secret, and reminds no one", async () => {
    await trialEndingTomorrow();
    for (const authorization of [undefined, "", `Bearer ${SECRET}x`, SECRET, `Basic ${SECRET}`]) {
      const res = await GET(call(authorization));
      expect(res.status).toBe(401);
      expect(((await res.json()) as ApiErrorBody).error.code).toBe("unauthorized");
    }
    expect(await (await getDb()).select().from(trialReminders)).toHaveLength(0);
  });

  it("refuses every call when no secret is configured", async () => {
    await trialEndingTomorrow();
    delete process.env.CRON_SECRET;
    resetEnvForTests();

    expect((await GET(call("Bearer "))).status).toBe(401);
    expect((await POST(call(`Bearer ${SECRET}`, "POST"))).status).toBe(401);
    expect(await (await getDb()).select().from(notifications)).toHaveLength(0);
  });

  it("reminds in the bell only when email isn't set up, and answers its stats", async () => {
    await trialEndingTomorrow();

    const res = await GET(call(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()) as CronResponse).toMatchObject({
      ok: true,
      job: "trial_reminders",
      complete: true,
      stats: { users: 1, emailsSent: 0, emailsFailed: 0, emailsSkipped: 1 },
    });
    const [notice] = await (await getDb()).select().from(notifications);
    expect(notice).toMatchObject({ kind: "trial_ending", link: "/dashboard/account" });

    const again = await POST(call(`Bearer ${SECRET}`, "POST"));
    expect(((await again.json()) as CronResponse).stats.users).toBe(0);
  });
});
