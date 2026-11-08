import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import {
  addVersion,
  daysLeft,
  EMPTY_HISTORY,
  freshTrash,
  HISTORY_LIMIT,
  MERGE_WINDOW_MS,
  newVersion,
  recordEdit,
  redoMove,
  TRASH_KEEP_MS,
  TRASH_LIMIT,
  undoMove,
  VERSION_LIMIT,
  versionToDrop,
  type ResumeHistory,
  type TrashedResume,
} from "./history";
import { historyKey, isTextField, type KeyLike } from "./history-keys";

function resume(title: string, updatedAt = 1_000): Resume {
  return { ...emptyResume(updatedAt), title };
}

describe("recordEdit", () => {
  it("merges plain edits closer together than the window into one step", () => {
    const a = resume("a");
    let history: ResumeHistory = recordEdit(EMPTY_HISTORY, a, undefined, 10_000);
    history = recordEdit(history, resume("ab"), undefined, 10_000 + MERGE_WINDOW_MS - 1);
    history = recordEdit(history, resume("abc"), undefined, 10_000 + 2 * MERGE_WINDOW_MS - 2);
    expect(history.past).toHaveLength(1);
    expect(history.past[0]?.resume).toBe(a);

    history = recordEdit(history, resume("abcd"), undefined, 20_000);
    expect(history.past).toHaveLength(2);
  });

  it("keeps a labelled edit as its own step, closed to the typing after it", () => {
    let history = recordEdit(EMPTY_HISTORY, resume("typed"), undefined, 1_000);
    history = recordEdit(history, resume("before fix"), { label: "Otto fixed a line" }, 1_100);
    history = recordEdit(history, resume("after fix"), undefined, 1_200);
    expect(history.past.map((s) => s.label)).toEqual([undefined, "Otto fixed a line", undefined]);
  });

  it("keeps only the last 100 steps", () => {
    let history: ResumeHistory = EMPTY_HISTORY;
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      history = recordEdit(history, resume(`v${i}`), { label: `step ${i}` }, i);
    }
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]?.label).toBe("step 5");
  });
});

describe("undoMove and redoMove", () => {
  it("walk back and forth, carrying each step's label, and a new edit clears redo", () => {
    const first = resume("first");
    const second = resume("second");
    let history = recordEdit(EMPTY_HISTORY, first, { label: "Otto fixed a line" }, 1);
    const undone = undoMove(history, second);
    expect(undone?.resume).toBe(first);
    expect(undone?.label).toBe("Otto fixed a line");
    history = undone!.history;
    expect(history.past).toHaveLength(0);
    expect(undoMove(history, first)).toBeNull();

    const redone = redoMove(history, first);
    expect(redoMove(redone!.history, second)).toBeNull();
    expect(redone?.resume).toBe(second);
    expect(redone?.history.past[0]?.label).toBe("Otto fixed a line");

    const afterUndo = undoMove(redone!.history, second)!.history;
    expect(afterUndo.future).toHaveLength(1);
    expect(recordEdit(afterUndo, first, undefined, 5).future).toEqual([]);
  });
});

describe("versions", () => {
  it("drops automatic saves before named ones when full", () => {
    const base = resume("r");
    let versions = [newVersion(base, "Auto", 0, true)];
    for (let i = 1; i < VERSION_LIMIT; i++)
      versions = addVersion(versions, newVersion(base, `v${i}`, i));
    expect(versions).toHaveLength(VERSION_LIMIT);
    expect(versionToDrop(versions)?.name).toBe("Auto");

    versions = addVersion(versions, newVersion(base, "One more", 99));
    expect(versions).toHaveLength(VERSION_LIMIT);
    expect(versions.some((v) => v.name === "Auto")).toBe(false);
    expect(versionToDrop(versions)?.name).toBe("v1");
  });
});

describe("trash", () => {
  const entry = (deletedAt: number): TrashedResume => ({ resume: resume("x"), deletedAt });

  it("keeps entries for 30 days, newest first, capped", () => {
    const now = 100 * TRASH_KEEP_MS;
    const kept = freshTrash([entry(now - TRASH_KEEP_MS), entry(now - 1), entry(now - 5)], now);
    expect(kept.map((t) => t.deletedAt)).toEqual([now - 1, now - 5]);
    const many = Array.from({ length: TRASH_LIMIT + 3 }, (_, i) => entry(now - i));
    expect(freshTrash(many, now)).toHaveLength(TRASH_LIMIT);
  });

  it("counts whole days left, today included", () => {
    const day = 24 * 60 * 60 * 1000;
    expect(daysLeft(entry(0), 0)).toBe(30);
    expect(daysLeft(entry(0), 29 * day + 1)).toBe(1);
    expect(daysLeft(entry(0), 30 * day)).toBe(0);
  });
});

describe("historyKey", () => {
  const key = (over: Partial<KeyLike>): KeyLike => ({
    key: "z",
    metaKey: false,
    ctrlKey: true,
    shiftKey: false,
    altKey: false,
    ...over,
  });
  const button = { tagName: "BUTTON", closest: () => null };

  it("maps Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z and Ctrl+Y", () => {
    expect(historyKey(key({}), button)).toBe("undo");
    expect(historyKey(key({ ctrlKey: false, metaKey: true }), button)).toBe("undo");
    expect(historyKey(key({ shiftKey: true, key: "Z" }), button)).toBe("redo");
    expect(historyKey(key({ key: "y" }), null)).toBe("redo");
    expect(historyKey(key({ ctrlKey: false }), button)).toBeNull();
    expect(historyKey(key({ altKey: true }), button)).toBeNull();
  });

  it("leaves native undo alone in text fields and dialogs", () => {
    expect(historyKey(key({}), { tagName: "TEXTAREA" })).toBeNull();
    expect(historyKey(key({}), { tagName: "INPUT", type: "email" })).toBeNull();
    expect(historyKey(key({}), { tagName: "DIV", isContentEditable: true })).toBeNull();
    expect(historyKey(key({}), { tagName: "BUTTON", closest: () => ({}) })).toBeNull();
    expect(isTextField({ tagName: "INPUT", type: "checkbox" })).toBe(false);
  });
});
