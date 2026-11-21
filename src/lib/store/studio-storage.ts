import type { PersistStorage, StorageValue } from "zustand/middleware";
import {
  readRemovals,
  readSave,
  removalsSince,
  SAVE_LEVELS,
  slimSave,
  type PersistedStudio,
  type Removals,
  type SavedStudio,
} from "./persisted";
import { sameStudio } from "./tab-merge";

type Area = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// The save this tab last read or wrote; another tab's save is measured against it.
type Known = { raw: string | null; state: SavedStudio | null; removed: Removals };

export type StudioStorageOptions = {
  area: () => Area | null;
  version: number;
  delayMs: number;
  maxWaitMs: number;
  migrate: (state: unknown, fromVersion: number) => unknown;
  // Applies another tab's save here and returns what to save back when this tab holds more.
  absorb: (
    theirs: SavedStudio | null,
    base: SavedStudio | null,
    removed: Removals,
  ) => PersistedStudio | null;
  warn: (message: string) => void;
};

// "failed": the last save didn't fit in storage, or storage is blocked.
export type LocalSave = "pending" | "saved" | "failed";

export type StudioStorage = PersistStorage<PersistedStudio> & {
  flush: () => void;
  sync: () => void;
  saveState: () => LocalSave;
  subscribeSaves: (listener: () => void) => () => void;
};

const FULL_WARNINGS = [
  "",
  "storage is full; saved without the trash",
  "storage is full; saved without the trash and saved versions",
];

let absorbing = false;

// True while another tab's save is applied, so its removals aren't taken for this tab's own.
export function isApplyingAnotherTab(): boolean {
  return absorbing;
}

// Writes the latest value once typing pauses, merging in whatever another tab saved meanwhile.
export function createStudioStorage(options: StudioStorageOptions): StudioStorage {
  let name: string | null = null;
  let pending: StorageValue<PersistedStudio> | null = null;
  let last: PersistedStudio | null = null;
  let known: Known | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dueBy = 0;
  let listening = false;
  let tight: { trash: unknown; versions: unknown; level: number } | null = null;
  let lostWrite = false;
  let reported: LocalSave = "saved";
  const saveListeners = new Set<() => void>();

  function report() {
    const next: LocalSave = pending ? "pending" : lostWrite ? "failed" : "saved";
    if (next === reported) return;
    reported = next;
    for (const listener of saveListeners) listener();
  }

  function area(): Area | null {
    try {
      return options.area();
    } catch {
      return null;
    }
  }

  // undefined: storage can't be read at all.
  function read(key: string): string | null | undefined {
    const storage = area();
    if (!storage) return undefined;
    try {
      return storage.getItem(key);
    } catch {
      return undefined;
    }
  }

  function parse(raw: string): { value: StorageValue<unknown>; removed: Removals } | null {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return null;
      const { state, version, removed } = parsed as Record<string, unknown>;
      return {
        value: typeof version === "number" ? { state, version } : { state },
        removed: readRemovals(removed),
      };
    } catch {
      return null;
    }
  }

  function savedOf(value: StorageValue<unknown>): SavedStudio | null {
    const version = value.version ?? options.version;
    if (version > options.version) return null;
    const state = version === options.version ? value.state : options.migrate(value.state, version);
    return readSave(state, Date.now());
  }

  function apply(theirs: SavedStudio | null, base: SavedStudio | null, removed: Removals) {
    absorbing = true;
    let back: PersistedStudio | null;
    try {
      back = options.absorb(theirs, base, removed);
    } finally {
      absorbing = false;
    }
    if (back && !pending) {
      pending = { state: back, version: options.version };
      schedule();
      report();
    }
  }

  function absorb(raw: string | null) {
    if (raw === null) {
      const had = known !== undefined && known.raw !== null;
      known = { raw: null, state: null, removed: {} };
      if (had) apply(null, null, {});
      return;
    }
    const parsed = parse(raw);
    const theirs = parsed ? savedOf(parsed.value) : null;
    // Unreadable, or saved by a newer version of the app: this tab stays as it is.
    if (!parsed || !theirs) return;
    const base = known?.state ?? null;
    known = { raw, state: theirs, removed: parsed.removed };
    apply(theirs, base, parsed.removed);
  }

  function sync() {
    if (name === null || known === undefined) return;
    const raw = read(name);
    if (raw === undefined || raw === known.raw) return;
    absorb(raw);
  }

  function write(key: string, value: StorageValue<PersistedStudio>) {
    const storage = area();
    if (!storage) {
      lostWrite = true;
      return;
    }
    const removed = removalsSince(
      known?.state ?? null,
      value.state,
      known?.removed ?? {},
      Date.now(),
    );
    const extras = Object.keys(removed).length > 0 ? { removed } : {};
    const { trash, versions } = value.state;
    const start = tight && tight.trash === trash && tight.versions === versions ? tight.level : 0;
    for (let level = start; level < SAVE_LEVELS; level++) {
      const raw = JSON.stringify({
        state: slimSave(value.state, level),
        version: value.version,
        ...extras,
      });
      try {
        storage.setItem(key, raw);
      } catch {
        continue;
      }
      if (level > start) options.warn(FULL_WARNINGS[level] ?? "");
      tight = level > 0 ? { trash, versions, level } : null;
      known = { raw, state: value.state, removed };
      last = value.state;
      lostWrite = false;
      return;
    }
    lostWrite = true;
    options.warn("storage is full; the studio wasn't saved");
  }

  function flush() {
    clearTimeout(timer);
    timer = undefined;
    if (!pending || name === null) return;
    const raw = read(name);
    if (raw !== undefined && (known === undefined || raw !== known.raw)) absorb(raw);
    const value = pending;
    pending = null;
    write(name, value);
    report();
  }

  function schedule() {
    const now = Date.now();
    if (timer === undefined) dueBy = now + options.maxWaitMs;
    clearTimeout(timer);
    timer = setTimeout(flush, Math.max(0, Math.min(options.delayMs, dueBy - now)));
  }

  function listen() {
    if (listening || typeof window === "undefined") return;
    listening = true;
    window.addEventListener("storage", (event) => {
      if (event.key === null || event.key === name) sync();
    });
    window.addEventListener("pagehide", flush);
    if (typeof document === "undefined") return;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
      else sync();
    });
  }

  return {
    getItem(key) {
      name = key;
      listen();
      flush();
      const raw = read(key);
      if (raw === undefined) return null;
      if (raw === null) {
        known = { raw: null, state: null, removed: {} };
        return null;
      }
      const parsed = parse(raw);
      // Known even when unreadable, so another tab's next save is still taken in.
      known = { raw, state: parsed ? savedOf(parsed.value) : null, removed: parsed?.removed ?? {} };
      if (!parsed) return null;
      return parsed.value as StorageValue<PersistedStudio>;
    },
    setItem(key, value) {
      name = key;
      if (!area()) {
        lostWrite = true;
        report();
        return;
      }
      listen();
      if (absorbing) {
        if (pending) pending = value;
        else last = value.state;
        return;
      }
      const latest = pending?.state ?? last;
      if (latest && sameStudio(latest, value.state)) return;
      pending = value;
      schedule();
      report();
    },
    removeItem(key) {
      name = key;
      clearTimeout(timer);
      timer = undefined;
      pending = null;
      last = null;
      try {
        area()?.removeItem(key);
      } catch {}
      known = { raw: null, state: null, removed: {} };
      report();
    },
    flush,
    sync,
    saveState: () => reported,
    subscribeSaves(listener) {
      saveListeners.add(listener);
      return () => {
        saveListeners.delete(listener);
      };
    },
  };
}
