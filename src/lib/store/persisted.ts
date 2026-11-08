import type { StateStorage } from "zustand/middleware";
import { freshTrash, type ResumeVersion, type TrashedResume } from "./history";

// What the studio keeps in localStorage, and how older saves are brought up to date.
//
// v1: resumes, order, activeId, reports, exportReports, step.
// v2: adds trash (deleted resumes, kept 30 days) and versions (saved versions per resume).

export const STUDIO_STORAGE_KEY = "otto-studio-v1";
export const STUDIO_STORE_VERSION = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Shapes are checked loosely on purpose: a save is our own data, and dropping a whole studio over
// one odd field would lose far more than it protects.
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

// zustand calls this when the saved version is older than STUDIO_STORE_VERSION. Without it, a
// version bump would throw the saved studio away.
export function migrateStudio(persisted: unknown, fromVersion: number): Record<string, unknown> {
  if (!isRecord(persisted)) return {};
  if (fromVersion < 2) return { ...persisted, trash: [], versions: {} };
  return persisted;
}

// Run on every load: entries past their 30 days leave the trash here.
export function sanitizeArchive(
  persisted: unknown,
  now: number,
): { trash: TrashedResume[]; versions: Record<string, ResumeVersion[]> } {
  const saved = isRecord(persisted) ? persisted : {};
  return { trash: freshTrash(trashOf(saved.trash), now), versions: versionsOf(saved.versions) };
}

// A full localStorage would make every save throw, so typing would stop being saved. The trash
// and saved versions are the bulky extras: when a save doesn't fit, try again without them, so
// the resumes themselves keep saving.
export function quotaSafe(storage: StateStorage): StateStorage {
  return {
    getItem: (name) => storage.getItem(name),
    removeItem: (name) => storage.removeItem(name),
    setItem: (name, value) => {
      try {
        return storage.setItem(name, value);
      } catch (error) {
        const slim = withoutArchive(value);
        if (slim === null) throw error;
        console.warn("[studio] storage is full; saved without the trash and versions");
        return storage.setItem(name, slim);
      }
    },
  };
}

function withoutArchive(value: string): string | null {
  try {
    const saved: unknown = JSON.parse(value);
    if (!isRecord(saved) || !isRecord(saved.state)) return null;
    return JSON.stringify({ ...saved, state: { ...saved.state, trash: [], versions: {} } });
  } catch {
    return null;
  }
}
