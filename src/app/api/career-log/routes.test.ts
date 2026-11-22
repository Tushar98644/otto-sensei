import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiErrorBody } from "@/lib/api/types";
import { resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import type {
  CareerEntryResponse,
  CareerLogResponse,
  CareerSettingsResponse,
  LogLinesResponse,
} from "@/lib/career-log/types";
import { DELETE, PUT as PUT_ENTRY } from "./entries/[month]/route";
import { POST as LINES } from "./lines/route";
import { GET } from "./route";
import { PUT as PUT_SETTINGS } from "./settings/route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

function send(path: string, method: string, body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const month = (value: string) => ({ params: Promise.resolve({ month: value }) });

async function read(): Promise<CareerLogResponse> {
  return (await (await GET()).json()) as CareerLogResponse;
}

beforeEach(async () => {
  await resetDb();
});

describe("/api/career-log", () => {
  it("needs a signed-in account", async () => {
    expect((await GET()).status).toBe(401);
    const put = await PUT_ENTRY(
      send("/api/career-log/entries/2026-11", "PUT", { shipped: "x" }),
      month("2026-11"),
    );
    expect(put.status).toBe(401);
    expect(
      (await PUT_SETTINGS(send("/api/career-log/settings", "PUT", { checkins: true }))).status,
    ).toBe(401);
  });

  it("saves, lists and deletes months on the Free plan", async () => {
    await signInAs("maya@example.com");
    const saved = await PUT_ENTRY(
      send("/api/career-log/entries/2026-11", "PUT", {
        shipped: "Rebuilt signup",
        numbers: "18% more",
      }),
      month("2026-11"),
    );
    expect(saved.status).toBe(200);
    expect(((await saved.json()) as CareerEntryResponse).entry).toMatchObject({
      month: "2026-11",
      shipped: "Rebuilt signup",
    });
    const log = await read();
    expect(log.entries).toHaveLength(1);
    expect(log.settings.checkins).toBe(false);

    const gone = await DELETE(send("/api/career-log/entries/2026-11", "DELETE"), month("2026-11"));
    expect(gone.status).toBe(200);
    expect((await read()).entries).toEqual([]);
  });

  it("turns away a bad month, an empty change and an answer that's too long", async () => {
    await signInAs("maya@example.com");
    const bad = await PUT_ENTRY(
      send("/api/career-log/entries/2026-13", "PUT", { shipped: "x" }),
      month("2026-13"),
    );
    expect(bad.status).toBe(400);
    const empty = await PUT_ENTRY(
      send("/api/career-log/entries/2026-11", "PUT", {}),
      month("2026-11"),
    );
    expect(empty.status).toBe(400);
    const long = await PUT_ENTRY(
      send("/api/career-log/entries/2026-11", "PUT", { shipped: "x".repeat(2_001) }),
      month("2026-11"),
    );
    expect(long.status).toBe(400);
    const extra = await PUT_ENTRY(
      send("/api/career-log/entries/2026-11", "PUT", { shipped: "x", userId: "someone" }),
      month("2026-11"),
    );
    expect(extra.status).toBe(400);
  });

  it("turns check-ins on with the browser's zone and refuses a zone that isn't one", async () => {
    await signInAs("maya@example.com");
    const on = await PUT_SETTINGS(
      send("/api/career-log/settings", "PUT", { checkins: true, timeZone: "Asia/Kolkata" }),
    );
    expect(on.status).toBe(200);
    const body = (await on.json()) as CareerSettingsResponse;
    expect(body.settings).toMatchObject({
      checkins: true,
      timeZone: "Asia/Kolkata",
      promptClosed: true,
    });
    expect(body.settings.nextCheckinOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const bad = await PUT_SETTINGS(
      send("/api/career-log/settings", "PUT", { timeZone: "Mars/Olympus" }),
    );
    expect(bad.status).toBe(400);
    const week = await PUT_SETTINGS(
      send("/api/career-log/settings", "PUT", { day: { week: 6, weekday: 1 } }),
    );
    expect(week.status).toBe(400);
  });

  it("refuses a request from another site", async () => {
    await signInAs("maya@example.com");
    const req = send("/api/career-log/settings", "PUT", { checkins: true });
    req.headers.set("sec-fetch-site", "cross-site");
    expect((await PUT_SETTINGS(req)).status).toBe(403);
  });
});

describe("/api/career-log/lines", () => {
  const body = {
    role: { title: "Designer", company: "Northwind" },
    from: "2026-09",
    to: "2026-11",
    existing: [],
  };

  it("is Pro: Free gets the upgrade answer", async () => {
    await signInAs("maya@example.com");
    const res = await LINES(send("/api/career-log/lines", "POST", body));
    expect(res.status).toBe(402);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("upgrade_required");
  });

  it("costs nothing when the range has no notes", async () => {
    await setPlan(await signInAs("maya@example.com"), "pro");
    const res = await LINES(send("/api/career-log/lines", "POST", body));
    expect(res.status).toBe(200);
    const answer = (await res.json()) as LogLinesResponse;
    expect(answer.result).toEqual({ lines: [], months: 0 });
    expect(answer.usage.draft.used).toBe(0);
  });

  it("writes lines from the notes in range only, as one draft", async () => {
    await setPlan(await signInAs("maya@example.com"), "pro");
    await PUT_ENTRY(
      send("/api/career-log/entries/2026-10", "PUT", { shipped: "Rebuilt the signup flow" }),
      month("2026-10"),
    );
    await PUT_ENTRY(
      send("/api/career-log/entries/2025-01", "PUT", { shipped: "Old work outside the range" }),
      month("2025-01"),
    );
    const res = await LINES(send("/api/career-log/lines", "POST", body));
    expect(res.status).toBe(200);
    const answer = (await res.json()) as LogLinesResponse;
    expect(answer.result.months).toBe(1);
    expect(answer.result.lines.map((line) => line.text)).toEqual(["Rebuilt the signup flow"]);
    expect(answer.result.lines[0]?.months).toEqual(["2026-10"]);
    expect(answer.usage.draft.used).toBe(1);
  });

  it("turns away a range that runs backwards", async () => {
    await setPlan(await signInAs("maya@example.com"), "pro");
    const res = await LINES(
      send("/api/career-log/lines", "POST", { ...body, from: "2026-12", to: "2026-01" }),
    );
    expect(res.status).toBe(400);
  });
});
