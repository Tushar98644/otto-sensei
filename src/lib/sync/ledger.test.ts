import { describe, expect, it } from "vitest";
import { createLedger, type LedgerStorage } from "./ledger";

function memoryStorage(initial?: string): LedgerStorage & { raw: () => string | null } {
  let value: string | null = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
    raw: () => value,
  };
}

describe("createLedger", () => {
  it("claims only unowned resumes and lets assign override", () => {
    const ledger = createLedger(memoryStorage());
    ledger.claim(["a", "b"], "user-1");
    ledger.claim(["b", "c"], "user-2");
    expect(ledger.ownerOf("a")).toBe("user-1");
    expect(ledger.ownerOf("b")).toBe("user-1");
    expect(ledger.ownerOf("c")).toBe("user-2");
    ledger.assign(["b"], "user-2");
    expect(ledger.ownerOf("b")).toBe("user-2");
  });

  it("persists across instances, as after a reload", () => {
    const storage = memoryStorage();
    const first = createLedger(storage);
    first.claim(["a"], "user-1");
    first.bury("b", "user-1");
    const second = createLedger(storage);
    expect(second.ownerOf("a")).toBe("user-1");
    expect(second.buried("user-1")).toEqual(["b"]);
    expect(second.buried("user-2")).toEqual([]);
  });

  it("drops the owner of a buried resume and unburies per owner", () => {
    const ledger = createLedger(memoryStorage());
    ledger.claim(["a"], "user-1");
    ledger.bury("a", "user-1");
    expect(ledger.ownerOf("a")).toBeUndefined();
    ledger.unbury("a", "user-2");
    expect(ledger.buried("user-1")).toEqual(["a"]);
    ledger.unbury("a", "user-1");
    expect(ledger.buried("user-1")).toEqual([]);
  });

  it("retains only resumes still in the browser", () => {
    const ledger = createLedger(memoryStorage());
    ledger.claim(["a", "b", "c"], "user-1");
    ledger.retain(["b"]);
    expect(ledger.ownerOf("a")).toBeUndefined();
    expect(ledger.ownerOf("b")).toBe("user-1");
  });

  it("caps tombstones, dropping the oldest", () => {
    const ledger = createLedger(memoryStorage());
    for (let i = 0; i < 250; i += 1) ledger.bury(`r${i}`, "user-1");
    const buried = ledger.buried("user-1");
    expect(buried).toHaveLength(200);
    expect(buried[0]).toBe("r50");
  });

  it("recovers from corrupt storage and keeps working without storage", () => {
    const corrupt = memoryStorage("{not json");
    const ledger = createLedger(corrupt);
    expect(ledger.ownerOf("a")).toBeUndefined();
    ledger.claim(["a"], "user-1");
    expect(createLedger(corrupt).ownerOf("a")).toBe("user-1");

    const memoryOnly = createLedger(null);
    memoryOnly.claim(["a"], "user-1");
    memoryOnly.claim(["b"], "user-1");
    expect(memoryOnly.ownerOf("a")).toBe("user-1");
    expect(memoryOnly.ownerOf("b")).toBe("user-1");
  });

  it("ignores malformed entries", () => {
    const storage = memoryStorage(
      JSON.stringify({ v: 1, owners: [["a", "user-1"], ["b"], [1, 2], "x"], tombstones: {} }),
    );
    const ledger = createLedger(storage);
    expect(ledger.ownerOf("a")).toBe("user-1");
    expect(ledger.ownerOf("b")).toBeUndefined();
    expect(ledger.buried("user-1")).toEqual([]);
  });
});
