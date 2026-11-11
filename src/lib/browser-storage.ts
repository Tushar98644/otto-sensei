// Private windows and blocked site data can throw on any access, even reading window.localStorage.

export type StorageArea = "local" | "session";

export function browserStorage(area: StorageArea = "local"): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return area === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function readItem(key: string, area: StorageArea = "local"): string | null {
  try {
    return browserStorage(area)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function readJsonItem(key: string, area: StorageArea = "local"): unknown {
  const raw = readItem(key, area);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

// False when the browser didn't keep it (storage blocked or full).
export function writeItem(key: string, value: string, area: StorageArea = "local"): boolean {
  try {
    const storage = browserStorage(area);
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function writeJsonItem(key: string, value: unknown, area: StorageArea = "local"): boolean {
  try {
    return writeItem(key, JSON.stringify(value), area);
  } catch {
    return false;
  }
}

export function removeItem(key: string, area: StorageArea = "local"): void {
  try {
    browserStorage(area)?.removeItem(key);
  } catch {
    // Blocked storage holds nothing to remove.
  }
}
