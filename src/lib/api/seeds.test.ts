import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";
import {
  dropSeeds,
  listFromVersions,
  plantSeeds,
  resetSeedsForTests,
  SEED_TTL_MS,
  SEED_WAIT_MS,
  takeSeed,
} from "./seeds";

let sent: { url: string; method: string }[] = [];

beforeEach(() => {
  resetSeedsForTests();
  sent = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      sent.push({ url, method: init?.method ?? "GET" });
      return Response.json({ ok: true, from: "network", notifications: [], unread: 0 });
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const body = { ok: true, notifications: [], unread: 2 };

describe("seeds", () => {
  it("answers a read once from the page, then from the network", async () => {
    plantSeeds({ notifications: Promise.resolve(body) });
    expect(await api.notifications()).toEqual(body);
    expect(sent).toEqual([]);
    await api.notifications();
    expect(sent.map((request) => request.url)).toEqual(["/api/notifications"]);
  });

  it("asks the network when the server had no answer", async () => {
    plantSeeds({
      workProfile: Promise.resolve(null),
      accountSetup: Promise.reject(new Error("x")),
    });
    await api.workProfile();
    await api.accountSetup();
    expect(sent.map((request) => request.url)).toEqual(["/api/profile", "/api/setup"]);
  });

  it("is planted once per page load, so a later layout can't bring old answers back", async () => {
    plantSeeds({});
    plantSeeds({ notifications: Promise.resolve(body) });
    await api.notifications();
    expect(sent).toHaveLength(1);
  });

  it("drops every answer at the first write, but not for reads sent as POST", async () => {
    plantSeeds({ shares: Promise.resolve(body), writings: Promise.resolve(body) });
    await api.listResumes({});
    await api.jobMatches({} as never);
    await api.calendarFeed();
    expect(takeSeed("shares")).not.toBeNull();
    await api.markNotificationsRead({ all: true });
    expect(takeSeed("writings")).toBeNull();
  });

  it("expires answers nobody asked for in time", () => {
    plantSeeds({ portfolio: Promise.resolve(body), shares: Promise.resolve(body) }, 1_000);
    expect(takeSeed("portfolio", 1_000 + SEED_TTL_MS)).not.toBeNull();
    expect(takeSeed("shares", 1_001 + SEED_TTL_MS)).toBeNull();
  });

  it("gives up on an answer still streaming and asks the network", async () => {
    vi.useFakeTimers();
    plantSeeds({ notifications: new Promise(() => {}) });
    const read = api.notifications();
    await vi.advanceTimersByTimeAsync(SEED_WAIT_MS);
    expect(await read).toMatchObject({ from: "network" });
  });

  it("stops planting after a sign-out's writes", () => {
    dropSeeds();
    plantSeeds({ notifications: Promise.resolve(body) });
    expect(takeSeed("notifications")).toBeNull();
  });
});

describe("listFromVersions", () => {
  const versions = {
    resumes: [
      { id: "a", updatedAt: 3 },
      { id: "b", updatedAt: 2 },
    ],
    deletedIds: ["c"],
  };

  it("rebuilds the list when the browser holds every version", () => {
    expect(listFromVersions(versions, { a: 3, b: 2, local: 1 })).toEqual({
      ok: true,
      resumes: [],
      deletedIds: ["c"],
      unchanged: ["a", "b"],
    });
  });

  it("needs the network for any resume the browser lacks or holds at another version", () => {
    expect(listFromVersions(versions, { a: 3 })).toBeNull();
    expect(listFromVersions(versions, { a: 3, b: 1 })).toBeNull();
  });

  it("answers the resume list from the page when nothing changed", async () => {
    plantSeeds({ resumeVersions: Promise.resolve(versions) });
    expect(await api.listResumes({ a: 3, b: 2 })).toMatchObject({ unchanged: ["a", "b"] });
    expect(sent).toEqual([]);
  });

  it("asks the network for the resume list when something changed", async () => {
    plantSeeds({ resumeVersions: Promise.resolve(versions) });
    await api.listResumes({ a: 1, b: 2 });
    expect(sent).toEqual([{ url: "/api/resumes", method: "POST" }]);
  });
});
