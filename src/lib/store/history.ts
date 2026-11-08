import type { RecruiterReport } from "@/lib/checks/types";
import { cleanTitle, isTitleTaken, resumeTitle } from "@/lib/resume/ops";
import { newId, type Resume } from "@/lib/resume/schema";

// Pure building blocks for undo/redo, saved versions and the trash. The store wires them up; they
// live apart so the rules can be tested without zustand.

// ---- Undo and redo ----
//
// Kept in memory only, per resume: a reload starts a fresh history, like a text editor. Saved
// versions are the way back that survives a reload.

export const HISTORY_LIMIT = 100;
// Edits closer together than this are one step, so Undo takes back a typed phrase, not a letter.
export const MERGE_WINDOW_MS = 800;

// Names for steps made by Otto, so the Undo button can say what it will take back.
export const EDIT_LABELS = {
  fix: "Otto fixed a line",
  summary: "Otto wrote your summary",
  tailor: "Otto tailored this copy",
  format: "Changed the format",
} as const;

export type EditOptions = {
  // A named step: it never merges with typing before or after it. Use it for AI edits.
  label?: string;
};

export type HistoryStep = {
  // The resume on the other side of the change.
  resume: Resume;
  // What the change was, e.g. "Otto fixed a line". Absent for plain edits.
  label?: string;
};

export type ResumeHistory = {
  // Oldest first: the last one is what Undo returns to.
  past: readonly HistoryStep[];
  // The last one is what Redo returns to.
  future: readonly HistoryStep[];
  // When the latest plain edit landed, while the next one may still join it. null once a named
  // step, an undo or a redo closes the burst.
  burstAt: number | null;
};

export const EMPTY_HISTORY: ResumeHistory = { past: [], future: [], burstAt: null };

function step(resume: Resume, label: string | undefined): HistoryStep {
  return label ? { resume, label } : { resume };
}

// Notes `before` as the state an edit moved away from. A new edit always clears Redo.
export function recordEdit(
  history: ResumeHistory,
  before: Resume,
  options: EditOptions | undefined,
  now: number,
): ResumeHistory {
  const label = options?.label?.trim() || undefined;
  if (!label && history.burstAt !== null && now - history.burstAt < MERGE_WINDOW_MS) {
    // Same burst: the state before its first keystroke is already the undo point.
    return { past: history.past, future: [], burstAt: now };
  }
  const past = [...history.past, step(before, label)];
  return {
    past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
    future: [],
    burstAt: label ? null : now,
  };
}

export type HistoryMove = { history: ResumeHistory; resume: Resume; label?: string };

export function undoMove(history: ResumeHistory, current: Resume): HistoryMove | null {
  const last = history.past.at(-1);
  if (!last) return null;
  return {
    resume: last.resume,
    label: last.label,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, step(current, last.label)],
      burstAt: null,
    },
  };
}

export function redoMove(history: ResumeHistory, current: Resume): HistoryMove | null {
  const next = history.future.at(-1);
  if (!next) return null;
  return {
    resume: next.resume,
    label: next.label,
    history: {
      past: [...history.past, step(current, next.label)],
      future: history.future.slice(0, -1),
      burstAt: null,
    },
  };
}

// Puts an older state of `current` back without changing which resume it is. Its old name stays
// only while no other resume has taken it since, because two resumes never share a name.
export function adoptState(
  state: Resume,
  current: Resume,
  others: Iterable<Resume>,
  now: number,
): Resume {
  const title = isTitleTaken(resumeTitle(state), others, current.id) ? current.title : state.title;
  return { ...state, id: current.id, createdAt: current.createdAt, title, updatedAt: now };
}

// ---- Saved versions ----

export const VERSION_LIMIT = 20;
export const VERSION_NAME_MAX = 60;

export type ResumeVersion = {
  id: string;
  name: string;
  savedAt: number;
  resume: Resume;
  // Saved by the app (the state just before a restore), not named by the user.
  auto?: boolean;
};

export function cleanVersionName(name: string): string {
  return cleanTitle(name).slice(0, VERSION_NAME_MAX).trim();
}

export function newVersion(resume: Resume, name: string, now: number, auto = false): ResumeVersion {
  const version: ResumeVersion = { id: newId(), name, savedAt: now, resume };
  return auto ? { ...version, auto } : version;
}

// Newest first. Over the limit, automatic saves go before anything the user named.
export function addVersion(
  versions: readonly ResumeVersion[],
  version: ResumeVersion,
): ResumeVersion[] {
  const next = [version, ...versions];
  while (next.length > VERSION_LIMIT) {
    const oldestAuto = next.findLastIndex((v) => v.auto);
    next.splice(oldestAuto > 0 ? oldestAuto : next.length - 1, 1);
  }
  return next;
}

// The version that would be dropped to make room for one more, if any.
export function versionToDrop(versions: readonly ResumeVersion[]): ResumeVersion | null {
  if (versions.length < VERSION_LIMIT) return null;
  return versions.findLast((v) => v.auto) ?? versions.at(-1) ?? null;
}

// True when a version already holds this state. The edit time doesn't count: an undo puts back
// the same words under a new one.
export function isSaved(resume: Resume, versions: readonly ResumeVersion[]): boolean {
  const content = (r: Resume) => JSON.stringify({ ...r, updatedAt: 0 });
  const wanted = content(resume);
  return versions.some((v) => v.resume === resume || content(v.resume) === wanted);
}

export function suggestVersionName(versions: readonly ResumeVersion[]): string {
  return `Version ${versions.filter((v) => !v.auto).length + 1}`;
}

// ---- Trash ----
//
// Lives only in this browser. The cloud copy is deleted through sync as before, and the account
// refuses to bring a deleted id back, so restoring makes a copy under a new id.

export const TRASH_DAYS = 30;
export const TRASH_KEEP_MS = TRASH_DAYS * 24 * 60 * 60 * 1000;
// Each entry is a whole resume in localStorage, which is small and shared with everything else.
export const TRASH_LIMIT = 30;

export type TrashedResume = {
  resume: Resume;
  deletedAt: number;
  report?: RecruiterReport;
  versions?: ResumeVersion[];
};

// Newest first, without anything past its 30 days, and capped.
export function freshTrash(trash: readonly TrashedResume[], now: number): TrashedResume[] {
  return trash
    .filter((entry) => now - entry.deletedAt < TRASH_KEEP_MS)
    .sort((a, b) => b.deletedAt - a.deletedAt)
    .slice(0, TRASH_LIMIT);
}

// Whole days left before an entry goes for good, counting today: 30 right after deleting, 1 on
// the last day.
export function daysLeft(entry: TrashedResume, now: number): number {
  const left = entry.deletedAt + TRASH_KEEP_MS - now;
  return Math.max(0, Math.ceil(left / (24 * 60 * 60 * 1000)));
}
