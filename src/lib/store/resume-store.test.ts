import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJSONStorage, type StateStorage } from "zustand/middleware";
import type { RecruiterReport } from "@/lib/checks/types";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { EDIT_LABELS, useStudioStore } from "./resume-store";

const store = () => useStudioStore.getState();

function resume(title: string, updatedAt: number): Resume {
  return { ...emptyResume(updatedAt), title };
}

const report = { checks: [] } as unknown as RecruiterReport;

beforeEach(() => {
  store().clearAll();
});

describe("mergeFromCloud", () => {
  it("takes newer cloud copies and returns local ones the cloud lacks or has older", () => {
    const onlyLocal = resume("Only here", 1_000);
    const newerHere = resume("Newer here", 5_000);
    const newerThere = resume("Older here", 1_000);
    store().addResume(onlyLocal);
    store().addResume(newerHere);
    store().addResume(newerThere);
    const fromCloud = resume("Only in the cloud", 2_000);

    const toUpload = store().mergeFromCloud([
      { ...newerHere, title: "Stale cloud copy", updatedAt: 4_000 },
      { ...newerThere, title: "Newer cloud copy", updatedAt: 9_000 },
      fromCloud,
    ]);

    expect(toUpload.map((r) => r.id).sort()).toEqual([onlyLocal.id, newerHere.id].sort());
    expect(store().resumes[newerHere.id]?.title).toBe("Newer here");
    expect(store().resumes[newerThere.id]?.title).toBe("Newer cloud copy");
    expect(store().resumes[fromCloud.id]?.title).toBe("Only in the cloud");
    expect(store().order.at(-1)).toBe(fromCloud.id);
    expect(store().activeId).toBe(newerThere.id);
  });

  it("activates the first cloud resume in an empty studio", () => {
    const first = resume("First", 2_000);
    const second = resume("Second", 1_000);
    expect(store().mergeFromCloud([first, second])).toEqual([]);
    expect(store().order).toEqual([first.id, second.id]);
    expect(store().activeId).toBe(first.id);
  });

  it("drops local resumes the account deleted, with their reports, and never returns them", () => {
    const kept = resume("Kept", 1_000);
    const deleted = resume("Deleted elsewhere", 1_000);
    store().addResume(kept);
    store().addResume(deleted, report);
    store().setExportReport(deleted.id, report);
    store().setStep("fix");

    const toUpload = store().mergeFromCloud([], [deleted.id]);

    expect(toUpload.map((r) => r.id)).toEqual([kept.id]);
    expect(store().resumes[deleted.id]).toBeUndefined();
    expect(store().reports[deleted.id]).toBeUndefined();
    expect(store().exportReports[deleted.id]).toBeUndefined();
    expect(store().order).toEqual([kept.id]);
    expect(store().activeId).toBe(kept.id);
    expect(store().step).toBe("fix");
  });

  it("ignores a cloud copy that is also listed as deleted", () => {
    const ghost = resume("Ghost", 1_000);
    expect(store().mergeFromCloud([ghost], [ghost.id])).toEqual([]);
    expect(store().resumes).toEqual({});
    expect(store().activeId).toBeNull();
  });

  it("returns to upload when every local resume was deleted elsewhere", () => {
    const only = resume("Only", 1_000);
    store().addResume(only);
    store().setStep("download");

    store().mergeFromCloud([], [only.id]);

    expect(store().resumes).toEqual({});
    expect(store().order).toEqual([]);
    expect(store().activeId).toBeNull();
    expect(store().step).toBe("upload");
  });

  it("opens an incoming resume when the open one was deleted and nothing local is left", () => {
    const deleted = resume("Deleted", 1_000);
    const incoming = resume("From the cloud", 2_000);
    store().addResume(deleted);
    store().setStep("tailor");

    store().mergeFromCloud([incoming], [deleted.id]);

    expect(store().order).toEqual([incoming.id]);
    expect(store().activeId).toBe(incoming.id);
    expect(store().step).toBe("tailor");
  });

  it("applies the whole merge as one update, and none when nothing changes", () => {
    const deleted = resume("Deleted", 1_000);
    const same = resume("Same", 1_000);
    store().addResume(deleted);
    store().addResume(same);
    const listener = vi.fn();
    const unsubscribe = useStudioStore.subscribe(listener);

    store().mergeFromCloud([same, resume("New", 2_000)], [deleted.id]);
    expect(listener).toHaveBeenCalledTimes(1);

    listener.mockClear();
    store().mergeFromCloud([same], ["not-here"]);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe("renameResume", () => {
  it("saves a tidied name and counts it as an edit", () => {
    const mine = resume("Old", 1_000);
    store().addResume(mine);
    expect(store().renameResume(mine.id, "  Design\n roles  ")).toBe(true);
    expect(store().resumes[mine.id]?.title).toBe("Design roles");
    expect(store().resumes[mine.id]?.updatedAt).toBeGreaterThan(1_000);
  });

  it("refuses a blank name or an unknown resume, changing nothing", () => {
    const mine = resume("Kept", 1_000);
    store().addResume(mine);
    expect(store().renameResume(mine.id, "   ")).toBe(false);
    expect(store().renameResume("missing", "Name")).toBe(false);
    expect(store().resumes[mine.id]).toEqual(mine);
  });

  it("leaves an unchanged name alone, so it isn't uploaded again", () => {
    const mine = resume("Same", 1_000);
    store().addResume(mine);
    expect(store().renameResume(mine.id, " Same ")).toBe(true);
    expect(store().resumes[mine.id]?.updatedAt).toBe(1_000);
  });
});

describe("duplicateResume", () => {
  it("copies a resume under a new id and a (copy) title, at the top of the list", () => {
    const first = resume("First", 1_000);
    const original = resume("Design roles", 2_000);
    store().addResume(original, report);
    store().addResume(first);
    const id = store().duplicateResume(original.id);
    const copy = id ? store().resumes[id] : undefined;

    expect(copy).toBeDefined();
    expect(copy?.id).not.toBe(original.id);
    expect(copy?.title).toBe("Design roles (copy)");
    expect(copy?.basics).toEqual(original.basics);
    expect(store().order).toEqual([id, first.id, original.id]);
    expect(store().reports[id!]).toBe(report);
    expect(store().activeId).toBe(first.id);
    expect(store().resumes[original.id]).toEqual(original);
  });

  it("makes a copy that can change without touching the original", () => {
    const original = resume("Mine", 1_000);
    store().addResume(original);
    const id = store().duplicateResume(original.id)!;
    store().updateResume(id, (r) => ({ ...r, basics: { ...r.basics, name: "Changed" } }));
    expect(store().resumes[original.id]?.basics.name).toBe("");
  });

  it("returns null for an unknown resume", () => {
    expect(store().duplicateResume("missing")).toBeNull();
    expect(store().order).toEqual([]);
  });
});

describe("removeResume", () => {
  it("removes one resume and opens the newest remaining one", () => {
    const older = resume("Older", 1_000);
    const newer = resume("Newer", 2_000);
    store().addResume(older, report);
    store().addResume(newer);
    store().setStep("review");

    store().removeResume(newer.id);
    expect(store().order).toEqual([older.id]);
    expect(store().activeId).toBe(older.id);
    expect(store().reports[older.id]).toBe(report);
    expect(store().step).toBe("review");

    store().removeResume(older.id);
    expect(store().activeId).toBeNull();
    expect(store().reports).toEqual({});
    expect(store().step).toBe("upload");
  });

  it("keeps the open resume when another one is removed", () => {
    const open = resume("Open", 1_000);
    const other = resume("Other", 1_000);
    store().addResume(other);
    store().addResume(open);
    store().removeResume(other.id);
    expect(store().activeId).toBe(open.id);
  });
});

describe("persisted state", () => {
  it("still loads a studio saved by an earlier version", async () => {
    const saved = resume("Saved last month", 1_000);
    const values = new Map<string, string>([
      [
        "otto-studio-v1",
        JSON.stringify({
          state: {
            resumes: { [saved.id]: saved },
            order: [saved.id],
            activeId: saved.id,
            reports: {},
            exportReports: {},
            step: "fix",
          },
          version: 1,
        }),
      ],
    ]);
    const storage: StateStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    };
    const original = useStudioStore.persist.getOptions().storage;
    useStudioStore.persist.setOptions({ storage: createJSONStorage(() => storage) });
    try {
      await useStudioStore.persist.rehydrate();
      expect(store().resumes[saved.id]?.title).toBe("Saved last month");
      expect(store().activeId).toBe(saved.id);
      expect(store().step).toBe("fix");

      store().mergeFromCloud([], [saved.id]);
      expect(store().resumes).toEqual({});
    } finally {
      useStudioStore.persist.setOptions({ storage: original });
    }
  });
});

describe("unique resume names", () => {
  it("numbers a new resume whose name is taken", () => {
    const first = { ...emptyResume(), title: "Sample resume" };
    const second = { ...emptyResume(), title: "Sample resume" };
    store().addResume(first);
    store().addResume(second);
    expect(store().resumes[second.id]?.title).toBe("Sample resume (2)");
    expect(store().resumes[first.id]?.title).toBe("Sample resume");
  });

  it("refuses to rename onto another resume's name", () => {
    const a = { ...emptyResume(), title: "Design roles" };
    const b = { ...emptyResume(), title: "Backend roles" };
    store().addResume(a);
    store().addResume(b);
    expect(store().renameResume(b.id, "design ROLES")).toBe(false);
    expect(store().resumes[b.id]?.title).toBe("Backend roles");
  });

  it("gives a second copy its own name", () => {
    const original = { ...emptyResume(), title: "Design roles" };
    store().addResume(original);
    const one = store().duplicateResume(original.id)!;
    const two = store().duplicateResume(original.id)!;
    expect(store().resumes[one]?.title).toBe("Design roles (copy)");
    expect(store().resumes[two]?.title).toBe("Design roles (copy) (2)");
  });
});

function memoryStorage(values = new Map<string, string>()): StateStorage {
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe("undo and redo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function typeTitle(id: string, title: string, afterMs: number) {
    vi.advanceTimersByTime(afterMs);
    store().updateResume(id, (r) => ({ ...r, title }));
  }

  it("takes back a typing burst in one step and brings it back with redo", () => {
    const cv = resume("CV", 1_000);
    store().addResume(cv);
    typeTitle(cv.id, "CV 2", 10);
    typeTitle(cv.id, "CV 20", 300);
    typeTitle(cv.id, "CV 2026", 300);

    expect(store().undo(cv.id)).toBe(true);
    expect(store().resumes[cv.id]?.title).toBe("CV");
    expect(store().resumes[cv.id]!.updatedAt).toBeGreaterThan(cv.updatedAt);
    expect(store().undo(cv.id)).toBe(false);

    expect(store().redo(cv.id)).toBe(true);
    expect(store().resumes[cv.id]?.title).toBe("CV 2026");
    expect(store().redo(cv.id)).toBe(false);
  });

  it("splits edits further apart than the window, and keeps AI edits as named steps", () => {
    const cv = resume("CV", 1_000);
    store().addResume(cv);
    typeTitle(cv.id, "Typed", 10);
    vi.advanceTimersByTime(100);
    store().updateResume(cv.id, (r) => ({ ...r, title: "Fixed" }), { label: EDIT_LABELS.fix });
    typeTitle(cv.id, "Typed again", 100);
    typeTitle(cv.id, "Later", 2_000);

    expect(store().history[cv.id]?.past.map((s) => s.label)).toEqual([
      undefined,
      "Otto fixed a line",
      undefined,
      undefined,
    ]);
    store().undo(cv.id);
    store().undo(cv.id);
    expect(store().resumes[cv.id]?.title).toBe("Fixed");
    store().undo(cv.id);
    expect(store().resumes[cv.id]?.title).toBe("Typed");
    expect(store().history[cv.id]?.future.at(-1)?.label).toBe("Otto fixed a line");
  });

  it("never undoes a resume onto a name another resume has taken since", () => {
    const cv = resume("Design CV", 1_000);
    store().addResume(cv);
    store().renameResume(cv.id, "Old name");
    store().renameResume(cv.id, "New name");
    store().addResume(resume("Old name", 1_000));
    store().undo(cv.id);
    expect(store().resumes[cv.id]?.title).toBe("New name");
  });

  it("forgets a resume's history when a newer copy arrives from another device", () => {
    const cv = resume("CV", 1_000);
    store().addResume(cv);
    typeTitle(cv.id, "Edited here", 10);
    store().mergeFromCloud([{ ...cv, title: "Edited there", updatedAt: Date.now() + 5_000 }]);
    expect(store().undo(cv.id)).toBe(false);
    expect(store().resumes[cv.id]?.title).toBe("Edited there");
  });
});

describe("saved versions", () => {
  it("saves, restores as an undoable step, and keeps what was replaced", () => {
    const cv = resume("CV", 1_000);
    store().addResume(cv);
    store().updateResume(cv.id, (r) => ({ ...r, summary: "First summary" }));
    const saved = store().saveVersion(cv.id, "  Before   tailoring ");
    expect(saved?.name).toBe("Before tailoring");
    expect(store().saveVersion(cv.id, "   ")).toBeNull();
    expect(store().saveVersion("missing", "Name")).toBeNull();

    store().updateResume(cv.id, (r) => ({ ...r, summary: "Second summary" }), { label: "x" });
    expect(store().restoreVersion(cv.id, saved!.id)).toBe(true);
    expect(store().resumes[cv.id]?.summary).toBe("First summary");
    expect(store().resumes[cv.id]?.id).toBe(cv.id);

    const versions = store().versions[cv.id]!;
    expect(versions.map((v) => v.name)).toEqual([
      "Before restoring “Before tailoring”",
      "Before tailoring",
    ]);
    expect(versions[0]?.auto).toBe(true);
    expect(versions[0]?.resume.summary).toBe("Second summary");

    store().undo(cv.id);
    expect(store().resumes[cv.id]?.summary).toBe("Second summary");

    store().restoreVersion(cv.id, versions[0]!.id);
    expect(store().versions[cv.id]).toHaveLength(2);

    store().deleteVersion(cv.id, saved!.id);
    expect(store().versions[cv.id]?.map((v) => v.name)).toEqual([
      "Before restoring “Before tailoring”",
    ]);
  });
});

describe("trash", () => {
  it("moves a deleted resume to the trash in one removal that sync sees as a deletion", () => {
    const cv = resume("CV", 1_000);
    store().addResume(cv, report);
    store().saveVersion(cv.id, "Good one");
    const removals: string[][] = [];
    const unsubscribe = useStudioStore.subscribe((state, prev) => {
      const gone = Object.keys(prev.resumes).filter((id) => !(id in state.resumes));
      if (gone.length) removals.push(gone);
    });
    expect(store().trashResume(cv.id)).toBe(true);
    unsubscribe();

    expect(removals).toEqual([[cv.id]]);
    expect(store().resumes[cv.id]).toBeUndefined();
    expect(store().versions[cv.id]).toBeUndefined();
    expect(store().trash).toHaveLength(1);
    expect(store().trash[0]?.report).toBe(report);
    expect(store().trashResume(cv.id)).toBe(false);
  });

  it("restores a copy under a new id with the same content, report and versions", () => {
    const cv = { ...resume("CV", 1_000), summary: "Ships things" };
    store().addResume(cv, report);
    store().saveVersion(cv.id, "Good one");
    store().trashResume(cv.id);

    const id = store().restoreFromTrash(cv.id);
    expect(id).not.toBeNull();
    expect(id).not.toBe(cv.id);
    const copy = store().resumes[id!]!;
    expect(copy.summary).toBe("Ships things");
    expect(copy.title).toBe("CV");
    expect(store().order[0]).toBe(id);
    expect(store().activeId).toBe(id);
    expect(store().reports[id!]).toBe(report);
    expect(store().versions[id!]?.[0]?.resume.id).toBe(id);
    expect(store().trash).toEqual([]);
    expect(store().restoreFromTrash(cv.id)).toBeNull();
  });

  it("names a restored copy apart from a resume that took its name", () => {
    const cv = resume("CV", 1_000);
    store().addResume(cv);
    store().trashResume(cv.id);
    store().addResume(resume("CV", 2_000));
    const id = store().restoreFromTrash(cv.id);
    expect(store().resumes[id!]?.title).toBe("CV (2)");
  });

  it("deletes one entry forever, or all of them", () => {
    const a = resume("A", 1_000);
    const b = resume("B", 1_000);
    store().addResume(a);
    store().addResume(b);
    store().trashResume(a.id);
    store().trashResume(b.id);
    store().deleteFromTrash(a.id);
    expect(store().trash.map((t) => t.resume.id)).toEqual([b.id]);
    store().emptyTrash();
    expect(store().trash).toEqual([]);
  });

  it("is not where sync's own removals go", () => {
    const cv = resume("CV", 1_000);
    store().addResume(cv);
    store().removeResume(cv.id);
    store().addResume(resume("Other", 1_000));
    store().mergeFromCloud([], [store().order[0]!]);
    expect(store().trash).toEqual([]);
  });
});

describe("persisted state, version 2", () => {
  it("saves versions and the trash, drops expired trash on load, and never saves history", async () => {
    const values = new Map<string, string>();
    const original = useStudioStore.persist.getOptions().storage;
    useStudioStore.persist.setOptions({ storage: createJSONStorage(() => memoryStorage(values)) });
    try {
      const cv = resume("CV", 1_000);
      const old = resume("Old", 1_000);
      store().addResume(cv);
      store().addResume(old);
      store().updateResume(cv.id, (r) => ({ ...r, summary: "Edited" }));
      store().saveVersion(cv.id, "Keep me");
      store().trashResume(old.id);

      const raw = JSON.parse(values.get("otto-studio-v1")!) as {
        version: number;
        state: Record<string, unknown>;
      };
      expect(raw.version).toBe(2);
      expect(raw.state.history).toBeUndefined();

      const state = raw.state as { trash: { deletedAt: number }[] };
      state.trash[0]!.deletedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
      store().clearAll();
      values.set("otto-studio-v1", JSON.stringify(raw));
      await useStudioStore.persist.rehydrate();
      expect(store().versions[cv.id]?.[0]?.name).toBe("Keep me");
      expect(store().trash).toEqual([]);
      expect(store().resumes[cv.id]?.summary).toBe("Edited");
    } finally {
      useStudioStore.persist.setOptions({ storage: original });
    }
  });
});

describe("edits that change nothing", () => {
  it("leave the resume, its date and every listener alone", () => {
    const cv = resume("CV", 1_000);
    store().addResume(cv);
    const listener = vi.fn();
    const unsubscribe = useStudioStore.subscribe(listener);

    store().updateResume(cv.id, (r) => r);
    store().updateResume("missing", (r) => ({ ...r, title: "Nope" }));
    store().setActive(cv.id);
    store().setActive("missing");
    store().setStep(store().step);
    unsubscribe();

    expect(listener).not.toHaveBeenCalled();
    expect(store().resumes[cv.id]).toBe(cv);
    expect(store().history[cv.id]).toBeUndefined();
  });

  it("date an edit after the copy it changes, even when this clock is behind", () => {
    const ahead = Date.now() + 60_000;
    const cv = resume("From a fast clock", ahead);
    store().addResume(cv);
    store().updateResume(cv.id, (r) => ({ ...r, title: "Edited here" }));
    expect(store().resumes[cv.id]?.updatedAt).toBe(ahead + 1);
  });
});

describe("mergeFromCloud with a resume changed on two devices", () => {
  it("keeps this device's copy as a saved version when the cloud's is newer", () => {
    const cv = resume("Edited here", 2_000);
    store().addResume(cv);
    const cloud = { ...cv, title: "Edited elsewhere", updatedAt: 3_000 };

    expect(store().mergeFromCloud([cloud], [], new Set([cv.id]))).toEqual([]);

    expect(store().resumes[cv.id]?.title).toBe("Edited elsewhere");
    const [kept] = store().versions[cv.id] ?? [];
    expect(kept?.name).toBe("Edits on this device");
    expect(kept?.auto).toBe(true);
    expect(kept?.resume.title).toBe("Edited here");
  });

  it("keeps the cloud's copy as a saved version when this device's is newer", () => {
    const cv = resume("Edited here", 4_000);
    store().addResume(cv);
    const cloud = { ...cv, title: "Edited elsewhere", updatedAt: 3_000 };

    expect(store().mergeFromCloud([cloud], [], new Set([cv.id]))).toEqual([cv]);

    expect(store().resumes[cv.id]).toBe(cv);
    expect(store().versions[cv.id]?.[0]?.name).toBe("Edits from another device");
    expect(store().versions[cv.id]?.[0]?.resume.title).toBe("Edited elsewhere");
  });

  it("keeps nothing extra for a resume that wasn't changed on both", () => {
    const cv = resume("CV", 1_000);
    store().addResume(cv);
    store().mergeFromCloud([{ ...cv, title: "Newer", updatedAt: 2_000 }]);
    expect(store().versions[cv.id]).toBeUndefined();
  });
});

type Tab = typeof import("./resume-store");

// One browser: tabs share localStorage, and each hears the others' saves.
function browser() {
  const values = new Map<string, string>();
  const listeners: ((event: { key: string | null }) => void)[] = [];
  const win = {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    },
    addEventListener: (type: string, listener: (event: { key: string | null }) => void) => {
      if (type === "storage") listeners.push(listener);
    },
    removeEventListener: () => {},
  };
  const announce = () => {
    for (const listener of listeners) listener({ key: "otto-studio-v1" });
  };
  const open = async (): Promise<Tab> => {
    vi.stubGlobal("window", win);
    vi.resetModules();
    const tab = await import("./resume-store");
    await tab.useStudioStore.persist.rehydrate();
    return tab;
  };
  return { win, values, announce, open };
}

function savedStudio(resumes: Resume[]): string {
  return JSON.stringify({
    state: {
      resumes: Object.fromEntries(resumes.map((r) => [r.id, r])),
      order: resumes.map((r) => r.id),
      activeId: resumes[0]?.id ?? null,
      reports: {},
      exportReports: {},
      step: "fix",
      versions: {},
      trash: [],
    },
    version: 2,
  });
}

describe("two tabs of one browser", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("an old tab's click keeps the version and trash a newer tab saved", async () => {
    const { values, open } = browser();
    const cv = resume("CV", 1_000);
    const other = resume("Other", 1_000);
    values.set("otto-studio-v1", savedStudio([cv, other]));
    const old = await open();
    const fresh = await open();

    fresh.useStudioStore.getState().saveVersion(cv.id, "Keep me");
    fresh.useStudioStore.getState().trashResume(other.id);
    fresh.flushStudio();
    // The old tab missed that save, as a frozen tab does, and then a resume card is clicked.
    old.useStudioStore.getState().setActive(other.id);
    old.useStudioStore.getState().setStep("tailor");
    old.flushStudio();

    const next = (await open()).useStudioStore.getState();
    expect(next.versions[cv.id]?.map((v) => v.name)).toEqual(["Keep me"]);
    expect(next.trash.map((t) => t.resume.id)).toEqual([other.id]);
    expect(next.resumes[other.id]).toBeUndefined();
    expect(old.useStudioStore.getState().versions[cv.id]).toHaveLength(1);
    expect(old.useStudioStore.getState().activeId).toBe(cv.id);
  });

  it("shows another tab's save at once, and drops undo steps that would bring back older text", async () => {
    const { values, announce, open } = browser();
    const cv = resume("CV", 1_000);
    values.set("otto-studio-v1", savedStudio([cv]));
    const a = await open();
    const b = await open();
    a.useStudioStore.getState().updateResume(cv.id, (r) => ({ ...r, title: "Typed in A" }));
    a.flushStudio();
    announce();

    b.useStudioStore.getState().updateResume(cv.id, (r) => ({ ...r, summary: "Typed in B" }));
    expect(b.useStudioStore.getState().resumes[cv.id]?.title).toBe("Typed in A");
    b.flushStudio();
    announce();

    expect(a.useStudioStore.getState().resumes[cv.id]?.summary).toBe("Typed in B");
    expect(a.useStudioStore.getState().undo(cv.id)).toBe(false);
  });

  it("keeps edits made in two tabs at once, signed out, when both save", async () => {
    const { values, open } = browser();
    const first = resume("First", 1_000);
    const second = resume("Second", 1_000);
    values.set("otto-studio-v1", savedStudio([first, second]));
    const a = await open();
    const b = await open();

    a.useStudioStore.getState().updateResume(first.id, (r) => ({ ...r, summary: "From A" }));
    b.useStudioStore.getState().updateResume(second.id, (r) => ({ ...r, summary: "From B" }));
    a.flushStudio();
    b.flushStudio();

    const next = (await open()).useStudioStore.getState();
    expect(next.resumes[first.id]?.summary).toBe("From A");
    expect(next.resumes[second.id]?.summary).toBe("From B");
  });

  it("clears every tab when one deletes the account's studio", async () => {
    const { values, announce, open } = browser();
    values.set("otto-studio-v1", savedStudio([resume("CV", 1_000)]));
    const a = await open();
    const b = await open();
    a.useStudioStore.getState().clearAll();
    a.useStudioStore.persist.clearStorage();
    announce();

    expect(b.useStudioStore.getState().resumes).toEqual({});
    vi.advanceTimersByTime(5_000);
    expect(values.has("otto-studio-v1")).toBe(false);
  });

  it("writes the studio once a burst of typing pauses", async () => {
    const { win, values, open } = browser();
    const cv = resume("CV", 1_000);
    values.set("otto-studio-v1", savedStudio([cv]));
    const tab = await open();
    const setItem = vi.spyOn(win.localStorage, "setItem");

    for (let i = 0; i < 20; i++) {
      tab.useStudioStore.getState().updateResume(cv.id, (r) => ({ ...r, summary: `${i}` }));
      vi.advanceTimersByTime(50);
    }
    expect(setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(values.get("otto-studio-v1")!).state.resumes[cv.id].summary).toBe("19");
  });
});
