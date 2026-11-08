import { describe, expect, it, vi } from "vitest";
import type { StateStorage } from "zustand/middleware";
import { migrateStudio, quotaSafe, sanitizeArchive } from "./persisted";

describe("migrateStudio", () => {
  it("brings a v1 save up to v2 without touching its resumes", () => {
    const v1 = { resumes: { a: { id: "a" } }, order: ["a"], activeId: "a", step: "fix" };
    expect(migrateStudio(v1, 1)).toEqual({ ...v1, trash: [], versions: {} });
    expect(migrateStudio("garbage", 1)).toEqual({});
  });
});

describe("sanitizeArchive", () => {
  it("keeps well-formed entries and drops broken ones", () => {
    const now = 1_000_000;
    const archive = sanitizeArchive(
      {
        trash: [{ resume: { id: "a" }, deletedAt: now - 1 }, { resume: null, deletedAt: 1 }, 7],
        versions: { a: [{ id: "v", name: "One", resume: { id: "a" } }, { id: 3 }], b: "nope" },
      },
      now,
    );
    expect(archive.trash).toHaveLength(1);
    expect(archive.versions).toEqual({ a: [{ id: "v", name: "One", resume: { id: "a" } }] });
  });
});

describe("quotaSafe", () => {
  it("saves without the trash and versions when the full save doesn't fit", () => {
    const saved: string[] = [];
    const storage: StateStorage = {
      getItem: () => null,
      removeItem: () => {},
      setItem: (_key, value) => {
        if (value.length > 80) throw new DOMException("full", "QuotaExceededError");
        saved.push(value);
      },
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const big = { state: { resumes: {}, trash: ["x".repeat(100)], versions: {} }, version: 2 };
    quotaSafe(storage).setItem("k", JSON.stringify(big));
    warn.mockRestore();
    expect(JSON.parse(saved[0]!)).toEqual({
      state: { resumes: {}, trash: [], versions: {} },
      version: 2,
    });
  });
});
