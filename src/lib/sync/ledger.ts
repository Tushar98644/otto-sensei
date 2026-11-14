// Owners stop a shared browser copying one person's resumes into the next one's account.

export type LedgerStorage = Pick<Storage, "getItem" | "setItem">;

export type SyncLedger = {
  ownerOf: (id: string) => string | undefined;
  claim: (ids: readonly string[], owner: string) => void;
  assign: (ids: readonly string[], owner: string) => void;
  forget: (ids: readonly string[]) => void;
  retain: (ids: readonly string[]) => void;
  bury: (id: string, owner: string) => void;
  unbury: (id: string, owner: string) => void;
  buried: (owner: string) => string[];
  // The version this browser last knew the account to hold, so a reload can tell unsynced edits.
  syncedAt: (id: string) => number | undefined;
  markSynced: (entries: readonly (readonly [string, number])[]) => void;
  refresh: () => void;
};

type Tombstone = { id: string; owner: string };
type LedgerData = {
  owners: Map<string, string>;
  tombstones: Tombstone[];
  synced: Map<string, number>;
};

const STORAGE_KEY = "otto-sync-v1";
const MAX_TOMBSTONES = 200;

export function createLedger(storage: LedgerStorage | null): SyncLedger {
  let data = read(storage) ?? emptyData();

  // Re-reads before every write so another tab's change isn't overwritten.
  function update(mutate: (draft: LedgerData) => boolean) {
    const draft = read(storage) ?? {
      owners: new Map(data.owners),
      tombstones: [...data.tombstones],
      synced: new Map(data.synced),
    };
    const changed = mutate(draft);
    data = draft;
    if (changed) write(storage, draft);
  }

  return {
    ownerOf: (id) => data.owners.get(id),
    claim: (ids, owner) =>
      update((draft) => {
        let changed = false;
        for (const id of ids) {
          if (draft.owners.has(id)) continue;
          draft.owners.set(id, owner);
          changed = true;
        }
        return changed;
      }),
    assign: (ids, owner) =>
      update((draft) => {
        let changed = false;
        for (const id of ids) {
          if (draft.owners.get(id) === owner) continue;
          draft.owners.set(id, owner);
          draft.synced.delete(id);
          changed = true;
        }
        return changed;
      }),
    forget: (ids) =>
      update((draft) => {
        let changed = false;
        for (const id of ids) {
          changed = draft.owners.delete(id) || changed;
          changed = draft.synced.delete(id) || changed;
        }
        return changed;
      }),
    retain: (ids) =>
      update((draft) => {
        const keep = new Set(ids);
        let changed = false;
        for (const id of [...draft.owners.keys()]) {
          if (!keep.has(id)) changed = draft.owners.delete(id) || changed;
        }
        for (const id of [...draft.synced.keys()]) {
          if (!keep.has(id)) changed = draft.synced.delete(id) || changed;
        }
        return changed;
      }),
    bury: (id, owner) =>
      update((draft) => {
        draft.owners.delete(id);
        draft.synced.delete(id);
        draft.tombstones = [
          ...draft.tombstones.filter((t) => t.id !== id || t.owner !== owner),
          { id, owner },
        ].slice(-MAX_TOMBSTONES);
        return true;
      }),
    unbury: (id, owner) =>
      update((draft) => {
        const before = draft.tombstones.length;
        draft.tombstones = draft.tombstones.filter((t) => t.id !== id || t.owner !== owner);
        return draft.tombstones.length !== before;
      }),
    buried: (owner) => data.tombstones.filter((t) => t.owner === owner).map((t) => t.id),
    syncedAt: (id) => data.synced.get(id),
    markSynced: (entries) =>
      update((draft) => {
        let changed = false;
        for (const [id, at] of entries) {
          if (draft.synced.get(id) === at) continue;
          draft.synced.set(id, at);
          changed = true;
        }
        return changed;
      }),
    refresh: () => {
      data = read(storage) ?? data;
    },
  };
}

function emptyData(): LedgerData {
  return { owners: new Map(), tombstones: [], synced: new Map() };
}

function read(storage: LedgerStorage | null): LedgerData | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed: unknown = JSON.parse(raw);
    return {
      owners: new Map(pairs(parsed, "owners")),
      tombstones: pairs(parsed, "tombstones").map(([id, owner]) => ({ id, owner })),
      synced: new Map(versionPairs(parsed)),
    };
  } catch {
    return null;
  }
}

function write(storage: LedgerStorage | null, data: LedgerData) {
  if (!storage) return;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        owners: [...data.owners],
        tombstones: data.tombstones.map((t) => [t.id, t.owner]),
        synced: [...data.synced],
      }),
    );
  } catch {}
}

function listOf(value: unknown, key: string): unknown[] {
  if (typeof value !== "object" || value === null) return [];
  const list: unknown = (value as Record<string, unknown>)[key];
  return Array.isArray(list) ? list : [];
}

function pairs(value: unknown, key: string): [string, string][] {
  return listOf(value, key).filter(
    (pair: unknown): pair is [string, string] =>
      Array.isArray(pair) &&
      pair.length === 2 &&
      typeof pair[0] === "string" &&
      typeof pair[1] === "string",
  );
}

function versionPairs(value: unknown): [string, number][] {
  return listOf(value, "synced").filter(
    (pair: unknown): pair is [string, number] =>
      Array.isArray(pair) &&
      pair.length === 2 &&
      typeof pair[0] === "string" &&
      typeof pair[1] === "number",
  );
}
