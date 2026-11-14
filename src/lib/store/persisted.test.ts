import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { ResumeVersion, TrashedResume } from "./history";
import {
  MAX_REMOVALS,
  migrateStudio,
  readSave,
  REMOVALS_KEPT_MS,
  removalsSince,
  sanitizeArchive,
  slimSave,
  type PersistedStudio,
} from "./persisted";

const NOW = 1_000_000_000;

function studio(resumes: Resume[], extra: Partial<PersistedStudio> = {}): PersistedStudio {
  return {
    resumes: Object.fromEntries(resumes.map((r) => [r.id, r])),
    order: resumes.map((r) => r.id),
    activeId: resumes[0]?.id ?? null,
    reports: {},
    exportReports: {},
    step: "fix",
    versions: {},
    trash: [],
    ...extra,
  };
}

function version(resume: Resume, id: string): ResumeVersion {
  return { id, name: id, savedAt: NOW, resume };
}

function trashed(resume: Resume): TrashedResume {
  return { resume, deletedAt: NOW - 1 };
}

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

describe("readSave", () => {
  it("keeps the saved objects themselves and leaves out what a full storage left out", () => {
    const cv = emptyResume(NOW);
    const saved = { resumes: { [cv.id]: cv }, order: [cv.id], reports: {}, step: "fix" };
    const read = readSave(saved, NOW);
    expect(read?.resumes).toBe(saved.resumes);
    expect(read?.order).toBe(saved.order);
    expect(read).not.toHaveProperty("trash");
    expect(read).not.toHaveProperty("versions");
    expect(readSave("garbage", NOW)).toBeNull();
  });
});

describe("removalsSince", () => {
  it("lists what was removed since the last save, keeping older removals nothing brought back", () => {
    const kept = emptyResume(NOW);
    const gone = emptyResume(NOW);
    const back = emptyResume(NOW);
    const base = studio([kept, gone], {
      versions: { [kept.id]: [version(kept, "v1"), version(kept, "v2")] },
      trash: [trashed(emptyResume(NOW))],
    });
    const next = studio([kept, back], { versions: { [kept.id]: [version(kept, "v1")] } });
    const carried = {
      "r:old": NOW - 1_000,
      "r:ancient": NOW - REMOVALS_KEPT_MS,
      [`r:${back.id}`]: 5,
    };

    const removals = removalsSince(base, next, carried, NOW);

    expect(removals).toEqual({
      "r:old": NOW - 1_000,
      [`r:${gone.id}`]: NOW,
      [`v:${kept.id}/v2`]: NOW,
      [`t:${base.trash[0]!.resume.id}`]: NOW,
    });
  });

  it("dates a removal no earlier than the removed copy, so a copy from a fast clock stays removed", () => {
    const ahead = { ...emptyResume(NOW), updatedAt: NOW + 600_000 };
    const removals = removalsSince(studio([ahead]), studio([]), {}, NOW);
    expect(removals[`r:${ahead.id}`]).toBe(NOW + 600_000);
  });

  it(`keeps only the newest ${MAX_REMOVALS}`, () => {
    const carried = Object.fromEntries(
      Array.from({ length: MAX_REMOVALS + 10 }, (_, i) => [`r:${i}`, NOW - i]),
    );
    const removals = removalsSince(null, studio([]), carried, NOW);
    expect(Object.keys(removals)).toHaveLength(MAX_REMOVALS);
    expect(removals["r:0"]).toBe(NOW);
    expect(removals[`r:${MAX_REMOVALS + 9}`]).toBeUndefined();
  });
});

describe("slimSave", () => {
  it("leaves out the trash first, then the saved versions too", () => {
    const cv = emptyResume(NOW);
    const full = studio([cv], { versions: { [cv.id]: [version(cv, "v1")] }, trash: [trashed(cv)] });
    expect(slimSave(full, 0)).toBe(full);
    expect(slimSave(full, 1)).toEqual({ ...full, trash: undefined });
    expect(slimSave(full, 1)).not.toHaveProperty("trash");
    expect(slimSave(full, 2)).not.toHaveProperty("versions");
    expect(slimSave(full, 2).resumes).toBe(full.resumes);
  });
});
