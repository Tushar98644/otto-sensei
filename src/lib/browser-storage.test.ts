import { afterEach, describe, expect, it, vi } from "vitest";
import {
  browserStorage,
  readItem,
  readJsonItem,
  removeItem,
  writeItem,
  writeJsonItem,
} from "./browser-storage";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function fullStorage(): Storage {
  return {
    ...memoryStorage(),
    setItem: () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    },
  };
}

function stubWindow(local: Storage | (() => never), session: Storage = memoryStorage()) {
  const win = { sessionStorage: session } as { sessionStorage: Storage; localStorage?: Storage };
  Object.defineProperty(win, "localStorage", {
    get: typeof local === "function" ? local : () => local,
  });
  vi.stubGlobal("window", win);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser storage", () => {
  it("has nothing to offer on the server", () => {
    expect(browserStorage()).toBeNull();
    expect(readItem("k")).toBeNull();
    expect(writeItem("k", "v")).toBe(false);
    expect(() => removeItem("k")).not.toThrow();
  });

  it("reads, writes and removes in the chosen area", () => {
    const local = memoryStorage();
    const session = memoryStorage();
    stubWindow(local, session);
    expect(writeItem("k", "local")).toBe(true);
    expect(writeItem("k", "session", "session")).toBe(true);
    expect(local.getItem("k")).toBe("local");
    expect(readItem("k", "session")).toBe("session");
    removeItem("k", "session");
    expect(session.getItem("k")).toBeNull();
    expect(readItem("k")).toBe("local");
  });

  it("round-trips JSON and reads missing or broken values as null", () => {
    const local = memoryStorage();
    stubWindow(local);
    expect(writeJsonItem("list", ["a", "b"])).toBe(true);
    expect(local.getItem("list")).toBe('["a","b"]');
    expect(readJsonItem("list")).toEqual(["a", "b"]);
    expect(readJsonItem("missing")).toBeNull();
    local.setItem("empty", "");
    expect(readJsonItem("empty")).toBeNull();
    local.setItem("broken", "{not json");
    expect(readJsonItem("broken")).toBeNull();
  });

  it("never throws when storage is blocked", () => {
    stubWindow(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    expect(browserStorage()).toBeNull();
    expect(readItem("k")).toBeNull();
    expect(readJsonItem("k")).toBeNull();
    expect(writeItem("k", "v")).toBe(false);
    expect(writeJsonItem("k", { a: 1 })).toBe(false);
    expect(() => removeItem("k")).not.toThrow();
  });

  it("reports a write the browser refused", () => {
    stubWindow(fullStorage());
    expect(writeItem("k", "v")).toBe(false);
    expect(writeJsonItem("k", [1])).toBe(false);
  });
});
