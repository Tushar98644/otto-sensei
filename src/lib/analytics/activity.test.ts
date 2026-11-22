import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetDb, signInAs } from "@/lib/auth/test-helpers";

const config = vi.hoisted(() => ({ key: "phc_test" as string | undefined }));
const events = vi.hoisted(() => ({
  views: [] as unknown[][],
  returns: [] as unknown[][],
  clicks: [] as unknown[][],
}));

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("./config", () => ({ posthogKey: () => config.key }));
vi.mock("./retention", () => ({
  trackDashboardView: (...args: unknown[]) => events.views.push(args),
  trackReturn: (...args: unknown[]) => events.returns.push(args),
  trackEmailClick: (...args: unknown[]) => events.clicks.push(args),
}));

const { calendarDay, daysBetween, markActiveDay, recordActivity } = await import("./activity");
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

describe("POST /api/activity", () => {
  it("records a signed-in page view", async () => {
    const user = await signInAs();
    const res = await post({ section: "letters", timeZone: "Asia/Kolkata" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, noted: true });
    expect(events.views).toEqual([[user.id, "letters"]]);
    expect(events.returns).toHaveLength(1);
  });

  it("notes nothing when the browser asks not to be tracked", async () => {
    await signInAs();
    for (const header of [{ dnt: "1" }, { "sec-gpc": "1" }] as Record<string, string>[]) {
      const res = await post({ section: "home" }, header);
      expect(await res.json()).toEqual({ ok: true, noted: false });
    }
    expect(events.views).toEqual([]);
  });

  it("notes nothing when analytics is off", async () => {
    config.key = undefined;
    await signInAs();
    expect(await (await post({ section: "home" })).json()).toEqual({ ok: true, noted: false });
    expect(events.views).toEqual([]);
  });

  it("needs a session, JSON, our own site and a known section", async () => {
    expect((await post({ section: "home" })).status).toBe(401);
    await signInAs();
    expect((await post({ section: "admin" })).status).toBe(400);
    expect(
      (await post({ section: "home", email: { campaign: "tips", link: "Jane Doe" } })).status,
    ).toBe(400);
    expect((await post({ section: "home" }, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await post({ section: "home" }, { "content-type": "text/plain" })).status).toBe(415);
    expect(events.views).toEqual([]);
  });
});
