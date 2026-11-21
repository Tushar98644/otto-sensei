import { describe, expect, it } from "vitest";
import { createLedger, type LedgerStorage } from "./ledger";

const KEY = "otto-sync-v1";

function memoryStorage(): LedgerStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("createLedger's synced versions", () => {
  it("remembers the account's version of each resume across a reload", () => {
    const storage = memoryStorage();
    createLedger(storage).markSynced([
      ["a", 1_000],
      ["b", 2_000],
    ]);
    const reloaded = createLedger(storage);
    expect(reloaded.syncedAt("a")).toBe(1_000);
    expect(reloaded.syncedAt("b")).toBe(2_000);
    expect(reloaded.syncedAt("c")).toBeUndefined();
  });

  it("writes nothing when the versions are already known", () => {
    const storage = memoryStorage();
    const ledger = createLedger(storage);
    ledger.markSynced([["a", 1_000]]);
    const written = storage.values.get(KEY);
    storage.values.set(KEY, written!.replace('"v":1', '"v":1,"marker":true'));

    ledger.markSynced([["a", 1_000]]);

    expect(storage.values.get(KEY)).toContain('"marker":true');
  });

  it("forgets a resume's version along with its owner, and when another account takes it", () => {
    const ledger = createLedger(memoryStorage());
    ledger.claim(["a", "b"], "user-1");
    ledger.markSynced([
      ["a", 1_000],
      ["b", 1_000],
    ]);

    ledger.forget(["a"]);
    expect(ledger.syncedAt("a")).toBeUndefined();
    expect(ledger.ownerOf("a")).toBeUndefined();

    ledger.assign(["b"], "user-1");
    expect(ledger.syncedAt("b")).toBe(1_000);
    ledger.assign(["b"], "user-2");
    expect(ledger.ownerOf("b")).toBe("user-2");
    expect(ledger.syncedAt("b")).toBeUndefined();
  });

  it("keeps only the versions of resumes still in the browser", () => {
    const ledger = createLedger(memoryStorage());
    ledger.markSynced([
      ["kept", 1_000],
      ["gone", 1_000],
    ]);

    ledger.retain(["kept"]);

    expect(ledger.syncedAt("kept")).toBe(1_000);
    expect(ledger.syncedAt("gone")).toBeUndefined();
  });

  it("drops a buried resume's version, so it never counts as backed up", () => {
    const ledger = createLedger(memoryStorage());
    ledger.markSynced([["a", 1_000]]);
    ledger.bury("a", "user-1");
    expect(ledger.syncedAt("a")).toBeUndefined();
  });

  it("ignores versions that aren't numbers", () => {
    const storage = memoryStorage();
    storage.values.set(
      KEY,
      JSON.stringify({ v: 1, synced: [["a", 1_000], ["b", "1000"], ["c"], "d"] }),
    );
    const ledger = createLedger(storage);
    expect(ledger.syncedAt("a")).toBe(1_000);
    expect(ledger.syncedAt("b")).toBeUndefined();
    expect(ledger.syncedAt("c")).toBeUndefined();
  });
});

describe("createLedger's tombstones", () => {
  it("keeps one tombstone per resume and account, however often it is buried", () => {
    const ledger = createLedger(memoryStorage());
    ledger.bury("a", "user-1");
    ledger.bury("b", "user-1");
    ledger.bury("a", "user-1");
    ledger.bury("a", "user-2");

    expect(ledger.buried("user-1")).toEqual(["b", "a"]);
    expect(ledger.buried("user-2")).toEqual(["a"]);

    ledger.unbury("a", "user-1");
    expect(ledger.buried("user-1")).toEqual(["b"]);
    expect(ledger.buried("user-2")).toEqual(["a"]);
  });

  it("writes nothing when unburying a resume that was never buried", () => {
    const storage = memoryStorage();
    const ledger = createLedger(storage);
    ledger.unbury("a", "user-1");
    expect(storage.values.has(KEY)).toBe(false);
  });
});

describe("createLedger with another tab", () => {
  it("sees another tab's changes after a refresh, and doesn't overwrite them", () => {
    const storage = memoryStorage();
    const here = createLedger(storage);
    const there = createLedger(storage);

    there.claim(["from-there"], "user-1");
    expect(here.ownerOf("from-there")).toBeUndefined();
    here.refresh();
    expect(here.ownerOf("from-there")).toBe("user-1");

    there.claim(["second"], "user-1");
    here.claim(["from-here"], "user-1");
    const reloaded = createLedger(storage);
    expect(reloaded.ownerOf("second")).toBe("user-1");
    expect(reloaded.ownerOf("from-here")).toBe("user-1");
  });

  it("keeps what it knows when the storage can no longer be read", () => {
    let blocked = false;
    const values = new Map<string, string>();
    const storage: LedgerStorage = {
      getItem: (key) => {
        if (blocked) throw new Error("SecurityError");
        return values.get(key) ?? null;
      },
      setItem: (key, value) => {
        values.set(key, value);
      },
    };
    const ledger = createLedger(storage);
    ledger.claim(["a"], "user-1");

    blocked = true;
    ledger.refresh();
    expect(ledger.ownerOf("a")).toBe("user-1");
    ledger.claim(["b"], "user-1");
    expect(ledger.ownerOf("b")).toBe("user-1");
  });

  it("doesn't throw or lose a change when the storage is full", () => {
    const storage: LedgerStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    const ledger = createLedger(storage);

    expect(() => ledger.claim(["a"], "user-1")).not.toThrow();
    expect(() => ledger.bury("b", "user-1")).not.toThrow();
    ledger.markSynced([["c", 1_000]]);
    ledger.refresh();

    expect(ledger.ownerOf("a")).toBe("user-1");
    expect(ledger.buried("user-1")).toEqual(["b"]);
    expect(ledger.syncedAt("c")).toBe(1_000);
  });
});

describe("createLedger when the storage is full", () => {
  function fillableStorage(values = new Map<string, string>()) {
    const storage = {
      full: false,
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (storage.full) throw new Error("QuotaExceededError");
        values.set(key, value);
      },
    };
    return storage;
  }

  it("lets a ledger made later in the page, as at sign-out, see what couldn't be saved", () => {
    const storage = fillableStorage();
    const ledger = createLedger(storage);
    ledger.claim(["old"], "user-1");

    storage.full = true;
    ledger.claim(["new"], "user-1");
    ledger.bury("gone", "user-1");
    ledger.markSynced([["new", 2_000]]);

    const signingOut = createLedger(storage);
    expect(signingOut.ownerOf("old")).toBe("user-1");
    expect(signingOut.ownerOf("new")).toBe("user-1");
    expect(signingOut.syncedAt("new")).toBe(2_000);
    expect(signingOut.buried("user-1")).toEqual(["gone"]);

    signingOut.forget(["new"]);
    ledger.refresh();
    expect(ledger.ownerOf("new")).toBeUndefined();
    expect(ledger.ownerOf("old")).toBe("user-1");
  });

  it("saves everything it kept once the storage has room again, then reads other tabs again", () => {
    const values = new Map<string, string>();
    const storage = fillableStorage(values);
    const ledger = createLedger(storage);

    storage.full = true;
    ledger.claim(["a"], "user-1");
    ledger.bury("b", "user-1");
    storage.full = false;
    ledger.markSynced([["a", 1_000]]);

    const reloaded = createLedger(fillableStorage(values));
    expect(reloaded.ownerOf("a")).toBe("user-1");
    expect(reloaded.buried("user-1")).toEqual(["b"]);
    expect(reloaded.syncedAt("a")).toBe(1_000);

    reloaded.claim(["from-there"], "user-2");
    ledger.refresh();
    expect(ledger.ownerOf("from-there")).toBe("user-2");
  });
});

describe("createLedger with something else saved under its key", () => {
  it("starts empty when the saved value isn't an object, then saves over it", () => {
    for (const saved of ["42", "null", '"owners"']) {
      const storage = memoryStorage();
      storage.values.set(KEY, saved);
      const ledger = createLedger(storage);
      expect(ledger.ownerOf("a")).toBeUndefined();
      expect(ledger.buried("user-1")).toEqual([]);

      ledger.claim(["a"], "user-1");
      expect(createLedger(storage).ownerOf("a")).toBe("user-1");
    }
  });
});
