import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { PersistedStudio, Removals, SavedStudio } from "./persisted";
import { createStudioStorage, isApplyingAnotherTab } from "./studio-storage";

const KEY = "otto-studio-v1";

type Absorb = (
  theirs: SavedStudio | null,
  base: SavedStudio | null,
  removed: Removals,
) => PersistedStudio | null;

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

const value = (state: PersistedStudio) => ({ state, version: 2 });

function setup({ limit = Infinity, absorb }: { limit?: number; absorb?: Absorb } = {}) {
  const values = new Map<string, string>();
  const area = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, raw: string) => {
      if (raw.length > limit) throw new DOMException("full", "QuotaExceededError");
      values.set(key, raw);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
  const warn = vi.fn();
  const absorbed = vi.fn<Absorb>((...args) => absorb?.(...args) ?? null);
  const storage = createStudioStorage({
    area: () => area,
    version: 2,
    delayMs: 400,
    maxWaitMs: 2_000,
    migrate: (state) => state,
    absorb: absorbed,
    warn,
  });
  const saved = () =>
    JSON.parse(values.get(KEY)!) as { state: PersistedStudio; version: number; removed?: Removals };
  return { storage, area, values, warn, absorbed, saved };
}

function titled(resume: Resume, title: string): Resume {
  return { ...resume, title };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createStudioStorage", () => {
  it("writes once typing pauses, and serializes nothing until then", () => {
    const { storage, area, saved } = setup();
    storage.getItem(KEY);
    const cv = emptyResume(1);
    for (let i = 0; i < 10; i++) {
      storage.setItem(KEY, value(studio([titled(cv, `Draft ${i}`)])));
      vi.advanceTimersByTime(100);
    }
    expect(area.setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(area.setItem).toHaveBeenCalledTimes(1);
    expect(saved().state.resumes[cv.id]?.title).toBe("Draft 9");
  });

  it("still writes every couple of seconds while changes keep coming", () => {
    const { storage, area } = setup();
    storage.getItem(KEY);
    const cv = emptyResume(1);
    for (let i = 0; i < 10; i++) {
      storage.setItem(KEY, value(studio([titled(cv, `Draft ${i}`)])));
      vi.advanceTimersByTime(300);
    }
    expect(area.setItem).toHaveBeenCalledTimes(1);
  });

  it("skips a value it already holds", () => {
    const { storage, area } = setup();
    storage.getItem(KEY);
    const state = studio([emptyResume(1)]);
    storage.setItem(KEY, value(state));
    storage.flush();
    storage.setItem(KEY, value({ ...state }));
    vi.advanceTimersByTime(5_000);
    expect(area.setItem).toHaveBeenCalledTimes(1);
  });

  it("writes at once on flush, and a removal cancels whatever was waiting", () => {
    const { storage, values, saved } = setup();
    storage.getItem(KEY);
    const cv = emptyResume(1);
    storage.setItem(KEY, value(studio([cv])));
    storage.flush();
    expect(saved().state.resumes[cv.id]).toBeDefined();

    storage.setItem(KEY, value(studio([titled(cv, "Edited")])));
    storage.removeItem(KEY);
    vi.advanceTimersByTime(5_000);
    expect(values.has(KEY)).toBe(false);
  });

  it("writes what's waiting before it reads", () => {
    const { storage } = setup();
    const state = studio([emptyResume(1)]);
    storage.setItem(KEY, value(state));
    expect(storage.getItem(KEY)).toEqual(value(state));
  });

  it("leaves out the trash, then the saved versions, while storage is full, and remembers it", () => {
    const { storage, area, warn, saved } = setup({ limit: 2_500 });
    storage.getItem(KEY);
    const cv = emptyResume(1);
    const big = titled(cv, "x".repeat(3_000));
    const versions = { [cv.id]: [{ id: "v1", name: "One", savedAt: 1, resume: big }] };
    const trash = [{ resume: big, deletedAt: Date.now() }];
    storage.setItem(KEY, value(studio([cv], { versions, trash })));
    storage.flush();

    expect(area.setItem).toHaveBeenCalledTimes(3);
    expect(saved().state).not.toHaveProperty("trash");
    expect(saved().state).not.toHaveProperty("versions");
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      "storage is full; saved without the trash and saved versions",
    );

    storage.setItem(KEY, value(studio([titled(cv, "Edited")], { versions, trash })));
    storage.flush();
    expect(area.setItem).toHaveBeenCalledTimes(4);
    expect(saved().state.resumes[cv.id]?.title).toBe("Edited");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("folds in what another tab saved before writing over it", () => {
    const a = emptyResume(1);
    const b = emptyResume(2);
    let absorbing = false;
    const { storage, values, absorbed, saved } = setup({
      absorb: (theirs) => {
        absorbing = isApplyingAnotherTab();
        storage.setItem(KEY, value(studio([a, ...Object.values(theirs?.resumes ?? {})])));
        return null;
      },
    });
    storage.getItem(KEY);
    storage.setItem(KEY, value(studio([a])));
    storage.flush();
    values.set(KEY, JSON.stringify(value(studio([b]))));

    storage.setItem(KEY, value(studio([titled(a, "Edited")])));
    storage.flush();

    expect(absorbed).toHaveBeenCalledOnce();
    const [theirs, base] = absorbed.mock.calls[0]!;
    expect(Object.keys(theirs?.resumes ?? {})).toEqual([b.id]);
    expect(Object.keys(base?.resumes ?? {})).toEqual([a.id]);
    expect(absorbing).toBe(true);
    expect(isApplyingAnotherTab()).toBe(false);
    expect(Object.keys(saved().state.resumes).sort()).toEqual([a.id, b.id].sort());
  });

  it("applies another tab's save once, and never its own", () => {
    const { storage, values, absorbed } = setup();
    storage.getItem(KEY);
    storage.setItem(KEY, value(studio([emptyResume(1)])));
    storage.flush();
    storage.sync();
    expect(absorbed).not.toHaveBeenCalled();

    values.set(KEY, JSON.stringify(value(studio([emptyResume(2)]))));
    storage.sync();
    storage.sync();
    expect(absorbed).toHaveBeenCalledOnce();
  });

  it("saves the merge back when this tab holds something the other save lacks", () => {
    const mine = studio([emptyResume(1)]);
    const { storage, values, saved } = setup({ absorb: () => mine });
    storage.getItem(KEY);
    values.set(KEY, JSON.stringify(value(studio([]))));
    storage.sync();
    vi.advanceTimersByTime(400);
    expect(saved().state).toEqual(mine);
  });

  it("lists in the save what this tab removed, so other tabs drop it too", () => {
    const { storage, saved } = setup();
    storage.getItem(KEY);
    const kept = emptyResume(1);
    const gone = emptyResume(1);
    storage.setItem(KEY, value(studio([kept, gone])));
    storage.flush();
    storage.setItem(KEY, value(studio([kept])));
    storage.flush();
    expect(Object.keys(saved().removed ?? {})).toEqual([`r:${gone.id}`]);
  });

  it("lets go when another tab deletes the save, and ignores one it can't read", () => {
    const { storage, values, absorbed } = setup();
    storage.getItem(KEY);
    storage.setItem(KEY, value(studio([emptyResume(1)])));
    storage.flush();

    values.set(KEY, "{not json");
    storage.sync();
    expect(absorbed).not.toHaveBeenCalled();

    values.delete(KEY);
    storage.sync();
    expect(absorbed).toHaveBeenCalledExactlyOnceWith(null, null, {});
  });

  it("still takes in another tab's save after loading one it couldn't read", () => {
    const { storage, values, absorbed } = setup();
    values.set(KEY, "{not json");
    expect(storage.getItem(KEY)).toBeNull();

    const theirs = emptyResume(2);
    values.set(KEY, JSON.stringify(value(studio([theirs]))));
    storage.sync();
    expect(absorbed).toHaveBeenCalledOnce();
    expect(Object.keys(absorbed.mock.calls[0]![0]?.resumes ?? {})).toEqual([theirs.id]);
  });
});

describe("createStudioStorage's save state", () => {
  it("is pending through the pause, then saved, and tells listeners each time", () => {
    const { storage } = setup();
    const listener = vi.fn();
    storage.subscribeSaves(listener);
    storage.getItem(KEY);
    expect(storage.saveState()).toBe("saved");

    const cv = emptyResume(1);
    storage.setItem(KEY, value(studio([titled(cv, "One")])));
    storage.setItem(KEY, value(studio([titled(cv, "Two")])));
    expect(storage.saveState()).toBe("pending");
    expect(listener).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(400);
    expect(storage.saveState()).toBe("saved");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("is failed when nothing fits in storage, or storage is blocked", () => {
    const { storage } = setup({ limit: 100 });
    storage.getItem(KEY);
    storage.setItem(KEY, value(studio([emptyResume(1)])));
    storage.flush();
    expect(storage.saveState()).toBe("failed");

    const blocked = createStudioStorage({
      area: () => null,
      version: 2,
      delayMs: 400,
      maxWaitMs: 2_000,
      migrate: (state) => state,
      absorb: () => null,
      warn: () => {},
    });
    blocked.setItem(KEY, value(studio([emptyResume(1)])));
    expect(blocked.saveState()).toBe("failed");
  });
});
