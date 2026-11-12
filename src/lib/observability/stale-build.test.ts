import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isStaleBuildError, reloadForStaleBuild } from "./stale-build";

function chunkError(message = "Failed to load chunk /_next/static/immutable/chunks/abc.js") {
  const error = new Error(message);
  error.name = "ChunkLoadError";
  return error;
}

describe("isStaleBuildError", () => {
  it("recognises webpack and Turbopack chunk failures", () => {
    expect(isStaleBuildError(chunkError())).toBe(true);
    expect(isStaleBuildError(chunkError("Loading chunk 42 failed."))).toBe(true);
  });

  it("recognises failed dynamic imports in Chrome, Safari and Firefox", () => {
    expect(isStaleBuildError(new TypeError("Failed to fetch dynamically imported module: /x.js"))).toBe(true);
    expect(isStaleBuildError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isStaleBuildError(new TypeError("error loading dynamically imported module"))).toBe(true);
  });

  it("ignores ordinary errors and thrown non-errors", () => {
    expect(isStaleBuildError(new Error("Supabase Auth is unavailable"))).toBe(false);
    expect(isStaleBuildError("ChunkLoadError")).toBe(false);
    expect(isStaleBuildError(null)).toBe(false);
  });
});

describe("reloadForStaleBuild", () => {
  const store = new Map<string, string>();
  const reload = vi.fn();

  beforeEach(() => {
    store.clear();
    reload.mockClear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });
    vi.stubGlobal("window", { location: { reload } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reloads once for a stale build, then not again within a minute", () => {
    expect(reloadForStaleBuild(chunkError(), 1_000_000)).toBe(true);
    expect(reloadForStaleBuild(chunkError(), 1_030_000)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads again after the cooldown", () => {
    reloadForStaleBuild(chunkError(), 1_000_000);
    expect(reloadForStaleBuild(chunkError(), 1_061_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("leaves other errors to the error screen", () => {
    expect(reloadForStaleBuild(new Error("boom"))).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("does not reload when session storage is blocked", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
    });
    expect(reloadForStaleBuild(chunkError())).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
