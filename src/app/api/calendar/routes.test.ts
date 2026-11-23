import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { applications, userSettings } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, createUser, resetDb, signInAs } from "@/lib/auth/test-helpers";
import type { CalendarFeedResponse } from "@/lib/calendar/types";
import { resetEnvForTests } from "@/lib/env";
import { GET as feed, HEAD as feedHead } from "./[token]/route";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const DAY = 86_400_000;

function ask(body: unknown = {}, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost/api/calendar", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

async function links(body: unknown = {}) {
  const res = await ask(body);
  expect(res.status).toBe(200);
  return ((await res.json()) as CalendarFeedResponse).links;
}

function read(https: string, method: "GET" | "HEAD" = "GET") {
  const token = new URL(https).pathname.split("/").pop() ?? "";
  const handler = method === "GET" ? feed : feedHead;
  return handler(new Request(https, { method }), { params: Promise.resolve({ token }) });
}

async function seedInterview(userId: string, company: string, interviewAt: number) {
  const now = Date.now();
  await (await getDb()).insert(applications).values({
    id: crypto.randomUUID(),
    userId,
    company,
    role: "Designer",
    appliedAt: now - 10 * DAY,
    status: "interview",
    statusChangedAt: now - DAY,
    interviewAt,
    interviewTime: 14 * 60 + 30,
    interviewZone: "Europe/Berlin",
    createdAt: now - 10 * DAY,
    updatedAt: now - DAY,
  });
}

describe("/api/calendar", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
    process.env.CRON_SECRET = "test-cron-secret-0123456789";
    process.env.NEXT_PUBLIC_APP_URL = "https://otto.test";
    resetEnvForTests();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_APP_URL;
    resetEnvForTests();
  });

  it("needs a signed-in account and a same-site request", async () => {
    expect((await ask()).status).toBe(401);
    await signInAs("maya@example.com");
    const res = await ask({}, { "sec-fetch-site": "cross-site" });
    expect(res.status).toBe(403);
  });

  it("gives one private link, the same each time, as https, webcal and Google's add page", async () => {
    await signInAs("maya@example.com");
    const first = await links();
    expect(first.https).toMatch(/^https:\/\/otto\.test\/api\/calendar\/[A-Za-z0-9_-]{43}\.ics$/);
    expect(first.webcal).toBe(first.https.replace("https:", "webcal:"));
    expect(first.google).toBe(
      `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(first.webcal)}`,
    );
    expect(await links()).toEqual(first);
    const [stored] = await (await getDb()).select().from(userSettings);
    // Only a hash of the token is kept.
    expect(stored!.calendarTokenHash).toMatch(/^.{43}$/);
    expect(first.https).not.toContain(stored!.calendarTokenHash);
    expect(first.https).not.toContain(stored!.calendarFeedId);
  });

  it("serves the account's interviews as text/calendar to anyone holding the link, and nothing to a guess", async () => {
    const maya = await signInAs("maya@example.com");
    const other = await createUser("other@example.com");
    await seedInterview(maya.id, "Stripe", Date.now() + 2 * DAY);
    await seedInterview(other.id, "Secret Co", Date.now() + 2 * DAY);
    const { https } = await links();
    cookieJar.clear();

    const res = await read(https);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.text();
    expect(body).toContain("SUMMARY:Interview: Designer at Stripe");
    expect(body).toContain("DTSTART;TZID=Europe/Berlin:");
    expect(body).not.toContain("Secret Co");

    const head = await read(https, "HEAD");
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");

    const guess = await read(
      "https://otto.test/api/calendar/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.ics",
    );
    expect(guess.status).toBe(404);
    expect((await read("https://otto.test/api/calendar/short.ics")).status).toBe(404);
  });

  it("retires the old link when a new one is made", async () => {
    await signInAs("maya@example.com");
    const old = await links();
    const fresh = await links({ renew: true });
    expect(fresh.https).not.toBe(old.https);
    expect((await read(old.https)).status).toBe(404);
    expect((await read(fresh.https)).status).toBe(200);
    expect(await links()).toEqual(fresh);
  });

  it("says so when links can't be signed", async () => {
    delete process.env.CRON_SECRET;
    resetEnvForTests();
    await signInAs("maya@example.com");
    const res = await ask();
    expect(res.status).toBe(503);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("server_error");
  });

  it("refuses a body it doesn't know", async () => {
    await signInAs("maya@example.com");
    expect((await ask({ renew: false })).status).toBe(400);
    expect((await ask({ userId: "x" })).status).toBe(400);
  });
});
