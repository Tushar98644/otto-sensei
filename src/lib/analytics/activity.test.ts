import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { userSettings } from "@/db/schema";
import { cookieJar, resetDb, signInAs } from "@/lib/auth/test-helpers";
import type { BatchEvent } from "./server";

const config = vi.hoisted(() => ({ key: "phc_test" as string | undefined }));
const events = vi.hoisted(() => ({
  views: [] as unknown[][],
  returns: [] as unknown[][],
  clicks: [] as unknown[][],
}));

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("./config", () => ({ posthogKey: () => config.key }));
vi.mock("./server", () => ({
  ANONYMOUS_ID: "anonymous",
  captureServerEvent: () => {},
  captureBatch: (sent: BatchEvent[]) => batches.push([...sent]),
}));
vi.mock("./retention", () => ({
  trackDashboardView: (...args: unknown[]) => events.views.push(args),
  trackReturn: (...args: unknown[]) => events.returns.push(args),
  trackEmailClick: (...args: unknown[]) => events.clicks.push(args),
}));

let batches: BatchEvent[][] = [];

const { calendarDay, daysBetween, markActiveDay, recordActivity } = await import("./activity");
const { resetBurstLimitsForTests } = await import("@/lib/burst-limit");
const { POST } = await import("@/app/api/activity/route");

const NOON_UTC = Date.UTC(2026, 10, 22, 12);

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost/api/activity", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
  config.key = "phc_test";
  events.views = [];
  events.returns = [];
  events.clicks = [];
  batches = [];
  resetBurstLimitsForTests();
});

describe("calendarDay", () => {
  it("is the date where the person is", () => {
    const lateEvening = Date.UTC(2026, 10, 22, 20, 30);
    expect(calendarDay(lateEvening, "UTC")).toBe("2026-11-22");
    expect(calendarDay(lateEvening, "Asia/Kolkata")).toBe("2026-11-23");
    expect(calendarDay(Date.UTC(2026, 10, 22, 3), "America/Los_Angeles")).toBe("2026-11-21");
  });

  it("falls back to UTC for a zone it doesn't know", () => {
    expect(calendarDay(NOON_UTC, "Mars/Olympus")).toBe("2026-11-22");
    expect(calendarDay(NOON_UTC)).toBe("2026-11-22");
  });

  it("counts whole days between two dates", () => {
    expect(daysBetween("2026-11-20", "2026-11-22")).toBe(2);
    expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
    expect(daysBetween("2025-11-22", "2026-11-22")).toBe(365);
  });
});

describe("markActiveDay", () => {
  it("marks the first page of each day once, and never goes back a day", async () => {
    const user = await signInAs();
    expect(await markActiveDay(user.id, "2026-11-20")).toEqual({ previous: null });
    expect(await markActiveDay(user.id, "2026-11-20")).toBeNull();
    expect(await markActiveDay(user.id, "2026-11-22")).toEqual({ previous: "2026-11-20" });
    expect(await markActiveDay(user.id, "2026-11-21")).toBeNull();
    expect(await markActiveDay(user.id, "2026-11-22")).toBeNull();
  });
});

describe("recordActivity", () => {
  it("notes the page, then the return on the first page of a day", async () => {
    const user = await signInAs();
    await recordActivity(user.id, { section: "home", timeZone: "UTC" }, NOON_UTC);
    await recordActivity(user.id, { section: "jobs", timeZone: "UTC" }, NOON_UTC + 60_000);
    await recordActivity(user.id, { section: "applications" }, NOON_UTC + 3 * 86_400_000);
    expect(events.views).toEqual([
      [user.id, "home"],
      [user.id, "jobs"],
      [user.id, "applications"],
    ]);
    expect(events.returns).toEqual([
      [user.id, "home", null],
      [user.id, "applications", 3],
    ]);
  });

  it("keeps each day for the weekly recap, the date only", async () => {
    const user = await signInAs();
    await recordActivity(user.id, { section: "home", timeZone: "Asia/Kolkata" }, NOON_UTC);
    await recordActivity(user.id, { section: "jobs", timeZone: "Asia/Kolkata" }, NOON_UTC + 60_000);
    await recordActivity(user.id, { section: "home", timeZone: "UTC" }, NOON_UTC + 86_400_000);
    const db = await getDb();
    const [row] = await db
      .select({ days: userSettings.activeDays })
      .from(userSettings)
      .where(eq(userSettings.userId, user.id));
    expect(row?.days).toEqual(["2026-11-22", "2026-11-23"]);
  });

  it("notes the email link that led here", async () => {
    const user = await signInAs();
    await recordActivity(
      user.id,
      { section: "jobs", email: { campaign: "weekly_jobs", link: "tailor" } },
      NOON_UTC,
    );
    expect(events.clicks).toEqual([[user.id, { campaign: "weekly_jobs", link: "tailor" }]]);
  });
});

const VISITOR = "01a20428-edf9-75ce-a5ab-801a4bd4a0af";
const SESSION = "01a20428-edf9-72b9-9548-cf29353fa3e4";

function beacon(items: unknown[], extra: Record<string, unknown> = {}) {
  return { visitor: VISITOR, linked: false, session: SESSION, items, ...extra };
}

const view = (route: string, more: Record<string, unknown> = {}) => ({
  type: "view",
  route,
  device: "Desktop",
  ...more,
});

function forwarded() {
  return batches.flat();
}

describe("POST /api/activity", () => {
  it("forwards a signed-out page view under the visitor id, without a person profile", async () => {
    const res = await post(
      beacon([
        view("/resume-examples/[role]", {
          referrer: "www.google.com",
          utm: { utm_source: "newsletter" },
        }),
      ]),
    );
    expect(await res.json()).toEqual({ ok: true, noted: true, identified: false });
    expect(forwarded()).toEqual([
      {
        event: "$pageview",
        distinctId: VISITOR,
        properties: {
          $current_url: "http://localhost:3000/resume-examples/[role]",
          $host: "localhost:3000",
          $pathname: "/resume-examples/[role]",
          $session_id: SESSION,
          $process_person_profile: false,
          $device_type: "Desktop",
          $referrer: "https://www.google.com",
          $referring_domain: "www.google.com",
          utm_source: "newsletter",
        },
      },
    ]);
    expect(events.views).toEqual([]);
  });

  it("links the visitor to the account once, then sends as the account", async () => {
    const user = await signInAs();
    const first = await post(beacon([view("/dashboard/letters", { timeZone: "Asia/Kolkata" })]));
    expect(await first.json()).toEqual({ ok: true, noted: true, identified: true });
    expect(
      forwarded().map(({ event, distinctId, properties }) => [
        event,
        distinctId,
        properties.$anon_distinct_id ?? properties.plan ?? properties.$pathname,
      ]),
    ).toEqual([
      ["$identify", user.id, VISITOR],
      ["signed_in", user.id, "free"],
      ["$pageview", user.id, "/dashboard/letters"],
    ]);
    expect(forwarded()[2]?.properties).not.toHaveProperty("$process_person_profile");
    expect(events.views).toEqual([[user.id, "letters"]]);
    expect(events.returns).toHaveLength(1);

    batches = [];
    const second = await post(beacon([view("/pricing")], { linked: true }));
    expect(await second.json()).toEqual({ ok: true, noted: true, identified: false });
    expect(forwarded().map(({ event, distinctId }) => [event, distinctId])).toEqual([
      ["$pageview", user.id],
    ]);
  });

  it("records the app section from the page template", async () => {
    const user = await signInAs();
    await post(beacon([view("/dashboard/applications/[id]/prep")], { linked: true }));
    expect(events.views).toEqual([[user.id, "prep"]]);
  });

  it("sends named events and web vitals with the page they came from", async () => {
    await post(
      beacon([
        { type: "event", event: "resume_imported", route: "/studio", props: { source: "pdf" } },
        {
          type: "vitals",
          route: "/pricing",
          metrics: { LCP: 1840, INP: 96, CLS: 0.04, TTFB: 310 },
        },
      ]),
    );
    const [event, vitals] = forwarded();
    expect(event).toMatchObject({
      event: "resume_imported",
      properties: { source: "pdf", $pathname: "/studio" },
    });
    expect(vitals).toMatchObject({
      event: "$web_vitals",
      properties: {
        $pathname: "/pricing",
        $web_vitals_LCP_value: 1840,
        $web_vitals_INP_value: 96,
        $web_vitals_CLS_value: 0.04,
        $web_vitals_TTFB_value: 310,
      },
    });
  });

  it("notes nothing when the browser asks not to be tracked", async () => {
    await signInAs();
    for (const header of [{ dnt: "1" }, { "sec-gpc": "1" }] as Record<string, string>[]) {
      const res = await post(beacon([view("/dashboard")]), header);
      expect(await res.json()).toEqual({ ok: true, noted: false, identified: false });
    }
    expect(forwarded()).toEqual([]);
    expect(events.views).toEqual([]);
  });

  it("notes nothing when analytics is off", async () => {
    config.key = undefined;
    await signInAs();
    const res = await post(beacon([view("/dashboard")]));
    expect(await res.json()).toEqual({ ok: true, noted: false, identified: false });
    expect(forwarded()).toEqual([]);
  });

  it("needs JSON from our own site and refuses raw addresses, unknown events and extra fields", async () => {
    for (const body of [
      beacon([view("/p/jane@example.com")]),
      beacon([view("/dashboard?email=jane")]),
      beacon([{ type: "event", event: "signed_in", route: "/" }]),
      beacon([{ type: "event", event: "landing_viewed", route: "/", props: { Email: "x" } }]),
      beacon([view("/", { email: { campaign: "tips", link: "Jane Doe" } })]),
      beacon([view("/")], { userId: "someone-else" }),
      beacon([]),
    ]) {
      expect((await post(body)).status).toBe(400);
    }
    const ok = beacon([view("/")]);
    expect((await post(ok, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await post(ok, { "content-type": "text/plain" })).status).toBe(415);
    expect(forwarded()).toEqual([]);
  });

  it("limits how often one address can send", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 61; i += 1) {
      statuses.push((await post(beacon([view("/")]), { "x-forwarded-for": "203.0.113.9" })).status);
    }
    expect(statuses.slice(0, 60).every((status) => status === 200)).toBe(true);
    expect(statuses[60]).toBe(429);
  });
});
