import { describe, expect, it } from "vitest";
import type { RecruiterReport } from "@/lib/checks/types";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { TRASH_KEEP_MS, VERSION_LIMIT, type ResumeVersion, type TrashedResume } from "./history";
import type { PersistedStudio, SavedStudio } from "./persisted";
import { mergeSaves, sameStudio } from "./tab-merge";

const NOW = 1_000_000_000;

function resume(title: string, updatedAt = NOW - 10_000): Resume {
  return { ...emptyResume(updatedAt), title };
}

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

// What another tab's save holds after a round trip through JSON: equal, but new objects.
function saved(state: PersistedStudio): SavedStudio {
  return structuredClone(state);
}

function version(of: Resume, id: string, savedAt = NOW - 5_000, auto = false): ResumeVersion {
  return auto ? { id, name: id, savedAt, resume: of, auto } : { id, name: id, savedAt, resume: of };
}

function trashed(of: Resume, deletedAt = NOW - 5_000): TrashedResume {
  return { resume: of, deletedAt };
}

function report(checkedAt: number): RecruiterReport {
  return { checks: [], checkedAt } as unknown as RecruiterReport;
}

describe("mergeSaves", () => {
  it("keeps a version and a trash entry saved in another tab when this tab never saw them", () => {
    const cv = resume("CV");
    const old = resume("Old");
    const mine = studio([cv]);
    const theirs = saved(
      studio([cv], { versions: { [cv.id]: [version(cv, "v1")] }, trash: [trashed(old)] }),
    );

    const { state, extra } = mergeSaves(mine, mine, theirs, {}, NOW);

    expect(state.versions[cv.id]?.map((v) => v.id)).toEqual(["v1"]);
    expect(state.trash.map((t) => t.resume.id)).toEqual([old.id]);
    expect(state.resumes).toBe(mine.resumes);
    expect(extra).toBe(false);
  });

  it("drops a resume the other tab removed, but only when the save says so", () => {
    const removed = resume("Removed there");
    const missing = resume("Missing there");
    const mine = studio([removed, missing]);
    const theirs = saved(studio([]));

    const merged = mergeSaves(mine, mine, theirs, { [`r:${removed.id}`]: NOW }, NOW);

    expect(Object.keys(merged.state.resumes)).toEqual([missing.id]);
    expect(merged.replaced).toEqual(new Set([removed.id]));
    expect(merged.state.activeId).toBe(missing.id);
    expect(merged.extra).toBe(true);
  });

  it("keeps a resume edited here after another tab removed it", () => {
    const cv = resume("CV", NOW);
    const mine = studio([cv]);
    const merged = mergeSaves(mine, mine, saved(studio([])), { [`r:${cv.id}`]: NOW - 1 }, NOW);
    expect(merged.state.resumes[cv.id]).toBe(cv);
  });

  it("takes the newer copy of a resume and reports it replaced", () => {
    const cv = resume("CV", NOW - 2_000);
    const mine = studio([cv]);
    const newer = { ...cv, title: "Edited there", updatedAt: NOW - 1_000 };
    const merged = mergeSaves(mine, mine, saved(studio([newer])), {}, NOW);
    expect(merged.state.resumes[cv.id]?.title).toBe("Edited there");
    expect(merged.replaced).toEqual(new Set([cv.id]));

    const older = mergeSaves(mine, mine, saved(studio([{ ...cv, updatedAt: 1 }])), {}, NOW);
    expect(older.state.resumes[cv.id]).toBe(cv);
    expect(older.extra).toBe(true);
  });

  it("doesn't bring back what this tab removed since the last save", () => {
    const cv = resume("CV");
    const trashedHere = resume("Trashed here");
    const base = studio([cv, trashedHere], {
      versions: { [cv.id]: [version(cv, "v1"), version(cv, "v2")] },
      trash: [trashed(resume("Emptied"))],
    });
    const mine = studio([cv], {
      versions: { [cv.id]: [version(cv, "v1")] },
      trash: [trashed(trashedHere)],
    });

    const { state } = mergeSaves(mine, base, saved(base), {}, NOW);

    expect(Object.keys(state.resumes)).toEqual([cv.id]);
    expect(state.versions[cv.id]?.map((v) => v.id)).toEqual(["v1"]);
    expect(state.trash.map((t) => t.resume.id)).toEqual([trashedHere.id]);
  });

  it("merges saved versions by id, drops ones deleted there, and keeps the limit", () => {
    const cv = resume("CV");
    const here = Array.from({ length: VERSION_LIMIT }, (_, i) =>
      version(cv, `here-${i}`, NOW - 10_000 - i, i % 2 === 0),
    );
    const mine = studio([cv], { versions: { [cv.id]: here } });
    const there = [version(cv, "there", NOW - 1), version(cv, "also", NOW - 2), ...here.slice(1)];
    const theirs = saved(studio([cv], { versions: { [cv.id]: there } }));

    const { state } = mergeSaves(mine, mine, theirs, { [`v:${cv.id}/here-0`]: NOW - 2 }, NOW);

    const ids = state.versions[cv.id]?.map((v) => v.id) ?? [];
    expect(ids).toHaveLength(VERSION_LIMIT);
    expect(ids.slice(0, 2)).toEqual(["there", "also"]);
    expect(ids).not.toContain("here-0");
    // Over the limit, the oldest copy kept for you goes first, as when saving one.
    expect(ids).not.toContain("here-18");
  });

  it("merges the trash by resume, drops entries removed there and ones past their time", () => {
    const a = resume("A");
    const b = resume("B");
    const expired = resume("Expired");
    const mine = studio([], { trash: [trashed(a), trashed(expired, NOW - TRASH_KEEP_MS - 1)] });
    const theirs = saved(studio([], { trash: [trashed(b)] }));

    const { state } = mergeSaves(mine, null, theirs, { [`t:${a.id}`]: NOW - 1 }, NOW);

    expect(state.trash.map((t) => t.resume.id)).toEqual([b.id]);
  });

  it("keeps the newer check of each resume, and none for a resume that's gone", () => {
    const cv = resume("CV");
    const mine = studio([cv], {
      reports: { [cv.id]: report(1) },
      exportReports: { gone: report(9) },
    });
    const theirs = saved(studio([cv], { reports: { [cv.id]: report(2) } }));
    const { state } = mergeSaves(mine, mine, theirs, {}, NOW);
    expect(state.reports[cv.id]?.checkedAt).toBe(2);
    expect(state.exportReports).toEqual({});
  });

  it("slots resumes made in another tab where they sit there, and keeps this tab's open one", () => {
    const a = resume("A");
    const b = resume("B");
    const added = resume("Added there");
    const mine = studio([a, b], { activeId: b.id, step: "tailor" });
    const theirs = saved(studio([a, added, b], { activeId: added.id, step: "upload" }));

    const { state } = mergeSaves(mine, mine, theirs, {}, NOW);

    expect(state.order).toEqual([a.id, added.id, b.id]);
    expect(state.activeId).toBe(b.id);
    expect(state.step).toBe("tailor");
  });

  it("opens another resume when the open one was removed in another tab", () => {
    const open = resume("Open");
    const other = resume("Other");
    const mine = studio([open, other], { activeId: open.id, step: "download" });
    const theirs = saved(studio([other]));
    const { state } = mergeSaves(mine, mine, theirs, { [`r:${open.id}`]: NOW }, NOW);
    expect(state.activeId).toBe(other.id);
    expect(state.step).toBe("download");
  });

  it("lets go of everything when the save itself was deleted", () => {
    const cv = resume("CV");
    const merged = mergeSaves(studio([cv]), null, null, {}, NOW);
    expect(merged.state.resumes).toEqual({});
    expect(merged.state.step).toBe("upload");
    expect(merged.replaced).toEqual(new Set([cv.id]));
    expect(merged.extra).toBe(false);
  });

  it("keeps this tab's trash and versions when a full storage left them out of the save", () => {
    const cv = resume("CV");
    const mine = studio([cv], { versions: { [cv.id]: [version(cv, "v1")] }, trash: [trashed(cv)] });
    const theirs: SavedStudio = {
      resumes: { [cv.id]: cv },
      order: [cv.id],
      reports: {},
      exportReports: {},
    };
    const merged = mergeSaves(mine, mine, theirs, {}, NOW);
    expect(merged.state.versions).toBe(mine.versions);
    expect(merged.state.trash).toBe(mine.trash);
    expect(merged.extra).toBe(false);
  });

  it("changes nothing, down to the objects, when the save holds the same studio", () => {
    const cv = resume("CV");
    const mine = studio([cv], {
      versions: { [cv.id]: [version(cv, "v1")] },
      trash: [trashed(resume("Old"))],
      reports: { [cv.id]: report(1) },
    });
    const merged = mergeSaves(mine, mine, saved(mine), {}, NOW);
    expect(sameStudio(merged.state, mine)).toBe(true);
    expect(merged.extra).toBe(false);
  });
});
