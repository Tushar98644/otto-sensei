import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PENDING_ACTION_MAX_AGE_MS,
  clearPendingAction,
  savePendingAction,
  takePendingAction,
} from "./pending-action";

const KEY = "otto-pending-action-v1";
const NOW = 1_800_000_000_000;

let stored: Map<string, string>;
const page = { pathname: "/studio" };

beforeEach(() => {
  stored = new Map();
  page.pathname = "/studio";
  vi.stubGlobal("window", {
    location: page,
    sessionStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
      removeItem: (key: string) => void stored.delete(key),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the action waiting on a Google sign-in", () => {
  it("comes back once, with its ids, on the page that saved it", () => {
    savePendingAction({ kind: "fix:r1", ids: { bulletId: "b7" } }, NOW);
    expect(takePendingAction("fix:r1", NOW + 30_000)).toEqual({ bulletId: "b7" });
    expect(takePendingAction("fix:r1", NOW + 30_000)).toBeNull();
    expect(stored.has(KEY)).toBe(false);
  });

  it("works without ids", () => {
    savePendingAction({ kind: "compare:r1" }, NOW);
    expect(takePendingAction("compare:r1", NOW)).toEqual({});
  });

  it("stays put for the hook that owns it when another kind asks first", () => {
    savePendingAction({ kind: "fix:r1", ids: { bulletId: "b7" } }, NOW);
    expect(takePendingAction("summary:r1", NOW)).toBeNull();
    expect(takePendingAction("fix:r2", NOW)).toBeNull();
    expect(takePendingAction("fix:r1", NOW)).toEqual({ bulletId: "b7" });
  });

  it("never runs on another page", () => {
    savePendingAction({ kind: "fix:r1", ids: { bulletId: "b7" } }, NOW);
    page.pathname = "/dashboard";
    expect(takePendingAction("fix:r1", NOW)).toBeNull();
    page.pathname = "/studio";
    expect(takePendingAction("fix:r1", NOW)).toEqual({ bulletId: "b7" });
  });

  it("is dropped once it is too old, so an old click never fires later", () => {
    savePendingAction({ kind: "fix:r1", ids: { bulletId: "b7" } }, NOW);
    expect(takePendingAction("other", NOW + PENDING_ACTION_MAX_AGE_MS + 1)).toBeNull();
    expect(stored.has(KEY)).toBe(false);
    savePendingAction({ kind: "fix:r1" }, NOW);
    expect(takePendingAction("fix:r1", NOW - 1)).toBeNull();
  });

  it("is forgotten on request", () => {
    savePendingAction({ kind: "fix:r1" }, NOW);
    clearPendingAction();
    expect(takePendingAction("fix:r1", NOW)).toBeNull();
  });

  it("ignores anything malformed in storage", () => {
    stored.set(KEY, "{not json");
    expect(takePendingAction("fix:r1", NOW)).toBeNull();
    stored.set(KEY, JSON.stringify({ kind: "fix:r1", path: "/studio", at: "soon", ids: {} }));
    expect(takePendingAction("fix:r1", NOW)).toBeNull();
    stored.set(
      KEY,
      JSON.stringify({
        kind: "fix:r1",
        path: "/studio",
        at: NOW,
        ids: { bulletId: 7, mode: "write" },
      }),
    );
    expect(takePendingAction("fix:r1", NOW)).toEqual({ mode: "write" });
  });

  it("does nothing where storage is blocked", () => {
    vi.stubGlobal("window", {
      location: page,
      get sessionStorage(): Storage {
        throw new Error("SecurityError");
      },
    });
    expect(() => savePendingAction({ kind: "fix:r1" }, NOW)).not.toThrow();
    expect(takePendingAction("fix:r1", NOW)).toBeNull();
  });
});
