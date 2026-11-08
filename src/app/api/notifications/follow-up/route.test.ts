import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import type { FollowUpActionResponse } from "@/lib/notifications/types";
import { followUpActionUrl } from "@/lib/notifications/unsubscribe";
import { POST } from "./route";

const DAY = 24 * 60 * 60 * 1_000;

async function seed(userId: string, status: "applied" | "interview" = "applied") {
  const id = crypto.randomUUID();
  const now = Date.now();
  await (await getDb()).insert(applications).values({
    id,
    userId,
    company: "Stripe",
    appliedAt: now - 8 * DAY,
    status,
    statusChangedAt: now,
    followUpAt: now - DAY,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

// What the /reminder page sends, from the link the email carried.
function bodyFrom(link: string | null) {
  const url = new URL(link ?? "https://otto.test/reminder");
  return {
    u: url.searchParams.get("u"),
    a: url.searchParams.get("a"),
    act: url.searchParams.get("do"),
    t: url.searchParams.get("t"),
  };
}

function send(body: unknown) {
  return POST(
    new Request("http://localhost/api/notifications/follow-up", {
      method: "POST",
      headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" },
      body: JSON.stringify(body),
    }),
  );
}

const followUpOf = async (id: string) =>
  (await (await getDb()).select().from(applications).where(eq(applications.id, id)))[0]?.followUpAt;

describe("POST /api/notifications/follow-up", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.CRON_SECRET = "test-cron-secret-0123456789";
    process.env.NEXT_PUBLIC_APP_URL = "https://otto.test";
    resetEnvForTests();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_APP_URL;
    resetEnvForTests();
  });

  it("marks a reminder done from its signed link, with no session", async () => {
    const maya = await createUser("maya@example.com");
    const id = await seed(maya.id);
    const res = await send(bodyFrom(followUpActionUrl(maya.id, id, "done")));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, company: "Stripe", followUpAt: null });
    expect(await followUpOf(id)).toBeNull();
  });

  it("snoozes for 3 days, but only while it's still on applied", async () => {
    const maya = await createUser("maya@example.com");
    const id = await seed(maya.id);
    const before = Date.now();
    const res = (await (await send(bodyFrom(followUpActionUrl(maya.id, id, "snooze")))).json()) as FollowUpActionResponse;
    expect(res.followUpAt).toBeGreaterThanOrEqual(before + 3 * DAY);
    expect(await followUpOf(id)).toBe(res.followUpAt);

    const moved = await seed(maya.id, "interview");
    const after = (await (await send(bodyFrom(followUpActionUrl(maya.id, moved, "snooze")))).json()) as FollowUpActionResponse;
    expect(after.followUpAt).toBeNull();
  });

  it("refuses a link for another action, account or application, and a bad token", async () => {
    const maya = await createUser("maya@example.com");
    const sam = await createUser("sam@example.com");
    const id = await seed(maya.id);
    const done = bodyFrom(followUpActionUrl(maya.id, id, "done"));
    for (const body of [
      { ...done, act: "snooze" },
      { ...done, u: sam.id },
      { ...done, a: crypto.randomUUID() },
      { ...done, t: "A".repeat(43) },
      { ...done, t: "short" },
    ]) {
      const res = await send(body);
      expect(res.status).toBe(400);
      expect(((await res.json()) as ApiErrorBody).error.code).toBe("bad_request");
    }
    expect(await followUpOf(id)).not.toBeNull();
  });

  it("says when the application is gone, and refuses every link once the secret is", async () => {
    const maya = await createUser("maya@example.com");
    const gone = crypto.randomUUID();
    expect((await send(bodyFrom(followUpActionUrl(maya.id, gone, "done")))).status).toBe(404);

    const id = await seed(maya.id);
    const link = followUpActionUrl(maya.id, id, "done");
    delete process.env.CRON_SECRET;
    resetEnvForTests();
    expect(followUpActionUrl(maya.id, id, "done")).toBeNull();
    expect((await send(bodyFrom(link))).status).toBe(400);
  });
});
