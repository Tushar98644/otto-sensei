import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobMatchesResponse } from "@/lib/job-feed/types";
import { forgetMatches, recallMatches, rememberShownMatches } from "./matches-memory";
import { JOB_MATCHES_STALE_MS } from "./options";

const data = { ok: true, jobs: [], page: 1, strong: 3 } as unknown as JobMatchesResponse;
const keyFor = (userId: string, view = "matches", page = 1) =>
  ["job-matches", userId, { view, page, profile: { skills: ["Figma"] } }, null] as const;

let stored: Map<string, string>;

beforeEach(() => {
  stored = new Map();
  const localStorage = {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => void stored.set(key, value),
    removeItem: (key: string) => void stored.delete(key),
  };
  vi.stubGlobal("window", { localStorage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("matches memory", () => {
  it("brings back the opening list for the same account while it's fresh", () => {
    rememberShownMatches(keyFor("ada"), data, 1_000);
    const client = new QueryClient();
    recallMatches(client, "ada", 1_000 + JOB_MATCHES_STALE_MS - 1);
    expect(client.getQueryData(keyFor("ada"))).toEqual(data);
    expect(client.getQueryState(keyFor("ada"))?.dataUpdatedAt).toBe(1_000);
  });

  it("leaves a stale list to the network", () => {
    rememberShownMatches(keyFor("ada"), data, 1_000);
    const client = new QueryClient();
    recallMatches(client, "ada", 1_000 + JOB_MATCHES_STALE_MS);
    expect(client.getQueryData(keyFor("ada"))).toBeUndefined();
  });

  it("never shows one account's list to another, and wipes it when someone else signs in", () => {
    rememberShownMatches(keyFor("ada"), data, 1_000);
    recallMatches(new QueryClient(), "grace", 1_001);
    const client = new QueryClient();
    recallMatches(client, "ada", 1_002);
    expect(client.getQueryData(keyFor("ada"))).toBeUndefined();
  });

  it("keeps only the first page of Matches, and nothing a Free account can't see", () => {
    rememberShownMatches(keyFor("ada", "saved"), data, 1_000);
    rememberShownMatches(keyFor("ada", "matches", 2), data, 1_000);
    rememberShownMatches(keyFor("ada"), { ...data, locked: true }, 1_000);
    expect(stored.size).toBe(0);
  });

  it("doesn't overwrite what this tab already holds", () => {
    rememberShownMatches(keyFor("ada"), data, 1_000);
    const client = new QueryClient();
    const newer = { ...data, strong: 5 };
    client.setQueryData(keyFor("ada"), newer, { updatedAt: 1_500 });
    recallMatches(client, "ada", 1_600);
    expect(client.getQueryData(keyFor("ada"))).toEqual(newer);
  });

  it("is forgotten at sign-out", () => {
    rememberShownMatches(keyFor("ada"), data, 1_000);
    forgetMatches();
    const client = new QueryClient();
    recallMatches(client, "ada", 1_001);
    expect(client.getQueryData(keyFor("ada"))).toBeUndefined();
  });
});
