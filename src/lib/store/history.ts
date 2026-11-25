import { fmt } from "@/i18n/format";
import type { RecruiterReport } from "@/lib/checks/types";
import { cleanTitle, isTitleTaken, resumeTitle } from "@/lib/resume/ops";
import { newId, type Resume } from "@/lib/resume/schema";

export const HISTORY_LIMIT = 100;
export const MERGE_WINDOW_MS = 800;

export const EDIT_LABELS = {
  fix: "Otto fixed a line",
  summary: "Otto wrote your summary",
  tailor: "Otto tailored this copy",
  format: "Changed the format",
} as const;

// Labels the store writes itself; the history controls show each in the studio's language.
export const RENAMED_LABEL = "Renamed the resume";
export const restoredLabel = (name: string) => `Restored “${name}”`;

export type EditOptions = {
  label?: string;
};

export type HistoryStep = {
  resume: Resume;
  label?: string;
};

export type ResumeHistory = {
  past: readonly HistoryStep[];
  future: readonly HistoryStep[];
  burstAt: number | null;
};

export const EMPTY_HISTORY: ResumeHistory = { past: [], future: [], burstAt: null };

function step(resume: Resume, label: string | undefined): HistoryStep {
  return label ? { resume, label } : { resume };
}

export function recordEdit(
  history: ResumeHistory,
  before: Resume,
  options: EditOptions | undefined,
  now: number,
): ResumeHistory {
  const label = options?.label?.trim() || undefined;
  if (!label && history.burstAt !== null && now - history.burstAt < MERGE_WINDOW_MS) {
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

export function adoptState(
  state: Resume,
  current: Resume,
  others: Iterable<Resume>,
  now: number,
): Resume {
  const title = isTitleTaken(resumeTitle(state), others, current.id) ? current.title : state.title;
  return { ...state, id: current.id, createdAt: current.createdAt, title, updatedAt: now };
}

export const VERSION_LIMIT = 20;
export const VERSION_NAME_MAX = 60;

export type ResumeVersion = {
  id: string;
  name: string;
  savedAt: number;
  resume: Resume;
  auto?: boolean;
};

export function cleanVersionName(name: string): string {
  return cleanTitle(name).slice(0, VERSION_NAME_MAX).trim();
}

export function newVersion(resume: Resume, name: string, now: number, auto = false): ResumeVersion {
  const version: ResumeVersion = { id: newId(), name, savedAt: now, resume };
  return auto ? { ...version, auto } : version;
}

export function addVersion(
  versions: readonly ResumeVersion[],
  version: ResumeVersion,
): ResumeVersion[] {
  return capVersions([version, ...versions]);
}

export function capVersions(versions: ResumeVersion[]): ResumeVersion[] {
  while (versions.length > VERSION_LIMIT) {
    const oldestAuto = versions.findLastIndex((v) => v.auto);
    versions.splice(oldestAuto > 0 ? oldestAuto : versions.length - 1, 1);
  }
  return versions;
}

// The copy that lost when a resume changed on two devices before they synced.
export const CONFLICT_VERSION_NAMES = {
  here: "Edits on this device",
  elsewhere: "Edits from another device",
} as const;

export function versionToDrop(versions: readonly ResumeVersion[]): ResumeVersion | null {
  if (versions.length < VERSION_LIMIT) return null;
  return versions.findLast((v) => v.auto) ?? versions.at(-1) ?? null;
}

export function isSaved(resume: Resume, versions: readonly ResumeVersion[]): boolean {
  const content = (r: Resume) => JSON.stringify({ ...r, updatedAt: 0 });
  const wanted = content(resume);
  return versions.some((v) => v.resume === resume || content(v.resume) === wanted);
}

export function suggestVersionName(
  versions: readonly ResumeVersion[],
  template = "Version {number}",
): string {
  return fmt(template, { number: versions.filter((v) => !v.auto).length + 1 });
}

// The account refuses a deleted id, so restoring makes a copy under a new id.

export const TRASH_DAYS = 30;
export const TRASH_KEEP_MS = TRASH_DAYS * 24 * 60 * 60 * 1000;
export const TRASH_LIMIT = 30;

export type TrashedResume = {
  resume: Resume;
  deletedAt: number;
  report?: RecruiterReport;
  versions?: ResumeVersion[];
};

export function freshTrash(trash: readonly TrashedResume[], now: number): TrashedResume[] {
  return trash
    .filter((entry) => now - entry.deletedAt < TRASH_KEEP_MS)
    .sort((a, b) => b.deletedAt - a.deletedAt)
    .slice(0, TRASH_LIMIT);
}

export function daysLeft(entry: TrashedResume, now: number): number {
  const left = entry.deletedAt + TRASH_KEEP_MS - now;
  return Math.max(0, Math.ceil(left / (24 * 60 * 60 * 1000)));
}
