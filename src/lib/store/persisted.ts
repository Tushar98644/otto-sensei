import type { StateStorage } from "zustand/middleware";
import { freshTrash, type ResumeVersion, type TrashedResume } from "./history";

export const STUDIO_STORAGE_KEY = "otto-studio-v1";
export const STUDIO_STORE_VERSION = 2;

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

// A full localStorage makes every save throw, so retry without trash and versions.
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
