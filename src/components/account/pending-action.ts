import { readJsonItem, removeItem, writeJsonItem } from "@/lib/browser-storage";

// `kind` names the action and what it's on (e.g. "fix:<resume id>"); `ids` is what it needs to run again.
export type PendingAction = { kind: string; ids?: Record<string, string> };

type Saved = { kind: string; ids: Record<string, string>; path: string; at: number };

const KEY = "otto-pending-action-v1";
// Room for Google's account picker and a second factor, never long enough to fire an old click later.
export const PENDING_ACTION_MAX_AGE_MS = 10 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readSaved(): Saved | null {
  const value = readJsonItem(KEY, "session");
  if (!isRecord(value) || !isRecord(value.ids)) return null;
  const { kind, path, at } = value;
  if (typeof kind !== "string" || typeof path !== "string" || typeof at !== "number") return null;
  const ids: Record<string, string> = {};
  for (const [key, id] of Object.entries(value.ids)) {
    if (typeof id === "string") ids[key] = id;
  }
  return { kind, ids, path, at };
}

function currentPath(): string | null {
  return typeof window === "undefined" ? null : window.location.pathname;
}

export function savePendingAction(action: PendingAction, now: number = Date.now()): void {
  const path = currentPath();
  if (path === null) return;
  const saved: Saved = { kind: action.kind, ids: action.ids ?? {}, path, at: now };
  writeJsonItem(KEY, saved, "session");
}

export function clearPendingAction(): void {
  removeItem(KEY, "session");
}

export function takePendingAction(
  kind: string,
  now: number = Date.now(),
): Record<string, string> | null {
  const saved = readSaved();
  if (!saved) return null;
  const age = now - saved.at;
  if (age < 0 || age > PENDING_ACTION_MAX_AGE_MS) {
    clearPendingAction();
    return null;
  }
  // Another hook on the page may own it, so it stays put.
  if (saved.kind !== kind || saved.path !== currentPath()) return null;
  clearPendingAction();
  return saved.ids;
}
