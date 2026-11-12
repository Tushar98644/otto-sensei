const RELOADED_AT_KEY = "otto:stale-build-reload";
const RELOAD_COOLDOWN_MS = 60_000;

const DYNAMIC_IMPORT_FAILED =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

export function isStaleBuildError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "ChunkLoadError" || DYNAMIC_IMPORT_FAILED.test(error.message);
}

export function reloadForStaleBuild(error: unknown, now = Date.now()): boolean {
  if (!isStaleBuildError(error)) return false;
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT_KEY));
    if (last && now - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOADED_AT_KEY, String(now));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
