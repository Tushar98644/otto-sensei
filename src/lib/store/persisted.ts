import type { RecruiterReport } from "@/lib/checks/types";
import type { Resume } from "@/lib/resume/schema";
import { freshTrash, type ResumeVersion, type TrashedResume } from "./history";
import type { StudioStep } from "./resume-store";

export const STUDIO_STORAGE_KEY = "otto-studio-v1";
export const STUDIO_STORE_VERSION = 2;

export type PersistedStudio = {
  resumes: Record<string, Resume>;
  order: string[];
  activeId: string | null;
  reports: Record<string, RecruiterReport>;
  exportReports: Record<string, RecruiterReport>;
  step: StudioStep;
  versions: Record<string, ResumeVersion[]>;
  trash: TrashedResume[];
};

// A save as storage holds it; trash and versions are left out when storage was too full for them.
export type SavedStudio = Pick<PersistedStudio, "resumes" | "order" | "reports" | "exportReports"> &
  Partial<Pick<PersistedStudio, "versions" | "trash">>;

// When each resume ("r:<id>"), version ("v:<id>/<version id>") or trash entry ("t:<id>") went.
export type Removals = Record<string, number>;

export const REMOVALS_KEPT_MS = 60 * 24 * 60 * 60 * 1000;
export const MAX_REMOVALS = 400;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trashOf(value: unknown): TrashedResume[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is TrashedResume =>
      isRecord(entry) && isRecord(entry.resume) && typeof entry.deletedAt === "number",
  );
}

function versionsOf(value: unknown): Record<string, ResumeVersion[]> {
  if (!isRecord(value)) return {};
  const versions: Record<string, ResumeVersion[]> = {};
  for (const [id, list] of Object.entries(value)) {
    if (!Array.isArray(list)) continue;
    const valid = list.filter(
      (v): v is ResumeVersion =>
        isRecord(v) && typeof v.id === "string" && typeof v.name === "string" && isRecord(v.resume),
    );
    if (valid.length > 0) versions[id] = valid;
  }
  return versions;
}

// Without a migrate, zustand would throw the saved studio away on a version bump.
export function migrateStudio(persisted: unknown, fromVersion: number): Record<string, unknown> {
  if (!isRecord(persisted)) return {};
  if (fromVersion < 2) return { ...persisted, trash: [], versions: {} };
  return persisted;
}

export function sanitizeArchive(
  persisted: unknown,
  now: number,
): { trash: TrashedResume[]; versions: Record<string, ResumeVersion[]> } {
  const saved = isRecord(persisted) ? persisted : {};
  return { trash: freshTrash(trashOf(saved.trash), now), versions: versionsOf(saved.versions) };
}

// Keeps the stored objects themselves, so a tab can tell which of its records it hasn't changed.
export function readSave(state: unknown, now: number): SavedStudio | null {
  if (!isRecord(state)) return null;
  const resumes = isRecord(state.resumes) ? (state.resumes as Record<string, Resume>) : {};
  const order =
    Array.isArray(state.order) && state.order.every((id) => typeof id === "string")
      ? (state.order as string[])
      : Object.keys(resumes);
  const record = (value: unknown) =>
    isRecord(value) ? (value as Record<string, RecruiterReport>) : {};
  return {
    resumes,
    order,
    reports: record(state.reports),
    exportReports: record(state.exportReports),
    ...(state.trash === undefined ? {} : { trash: freshTrash(trashOf(state.trash), now) }),
    ...(state.versions === undefined ? {} : { versions: versionsOf(state.versions) }),
  };
}

export function readRemovals(value: unknown): Removals {
  if (!isRecord(value)) return {};
  const removals: Removals = {};
  for (const [key, at] of Object.entries(value)) if (typeof at === "number") removals[key] = at;
  return removals;
}

function isPresent(state: PersistedStudio, key: string): boolean {
  const id = key.slice(2);
  if (key.startsWith("r:")) return Object.hasOwn(state.resumes, id);
  if (key.startsWith("t:")) return state.trash.some((entry) => entry.resume.id === id);
  const [resumeId = "", versionId] = id.split("/");
  return Boolean(state.versions[resumeId]?.some((v) => v.id === versionId));
}

// What `next` removed since `base`, plus the earlier removals nothing has brought back.
export function removalsSince(
  base: SavedStudio | null,
  next: PersistedStudio,
  carried: Removals,
  now: number,
): Removals {
  const removals: Removals = {};
  for (const [key, at] of Object.entries(carried)) {
    if (now - at < REMOVALS_KEPT_MS && !isPresent(next, key)) removals[key] = at;
  }
  if (base) {
    // A copy dated ahead of this clock (another device's) is still covered by its own removal.
    for (const [id, resume] of Object.entries(base.resumes)) {
      if (!Object.hasOwn(next.resumes, id)) removals[`r:${id}`] = Math.max(now, resume.updatedAt);
    }
    for (const [id, list] of Object.entries(base.versions ?? {})) {
      if (!Object.hasOwn(next.resumes, id)) continue;
      const kept = new Set((next.versions[id] ?? []).map((v) => v.id));
      for (const v of list) if (!kept.has(v.id)) removals[`v:${id}/${v.id}`] = now;
    }
    const trashed = new Set(next.trash.map((entry) => entry.resume.id));
    for (const entry of base.trash ?? []) {
      if (!trashed.has(entry.resume.id)) removals[`t:${entry.resume.id}`] = now;
    }
  }
  const entries = Object.entries(removals);
  if (entries.length <= MAX_REMOVALS) return removals;
  return Object.fromEntries(entries.sort((a, b) => b[1] - a[1]).slice(0, MAX_REMOVALS));
}

export const SAVE_LEVELS = 3;

// Smaller saves for a full localStorage: first without the trash, then without saved versions too.
export function slimSave(state: PersistedStudio, level: number): Partial<PersistedStudio> {
  if (level <= 0) return state;
  const slim: Partial<PersistedStudio> = { ...state };
  delete slim.trash;
  if (level > 1) delete slim.versions;
  return slim;
}
