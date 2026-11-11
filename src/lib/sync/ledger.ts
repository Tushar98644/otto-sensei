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
};

type Tombstone = { id: string; owner: string };
type LedgerData = { owners: Map<string, string>; tombstones: Tombstone[] };

const STORAGE_KEY = "otto-sync-v1";
const MAX_TOMBSTONES = 200;

export function createLedger(storage: LedgerStorage | null): SyncLedger {
  let data = read(storage) ?? emptyData();

  // Re-reads before every write so another tab's change isn't overwritten.
  function update(mutate: (draft: LedgerData) => boolean) {
    const draft = read(storage) ?? {
      owners: new Map(data.owners),
      tombstones: [...data.tombstones],
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
          changed = true;
        }
        return changed;
      }),
    forget: (ids) =>
      update((draft) => {
        let changed = false;
        for (const id of ids) changed = draft.owners.delete(id) || changed;
        return changed;
      }),
    retain: (ids) =>
      update((draft) => {
        const keep = new Set(ids);
        let changed = false;
        for (const id of [...draft.owners.keys()]) {
          if (!keep.has(id)) changed = draft.owners.delete(id) || changed;
        }
        return changed;
      }),
    bury: (id, owner) =>
      update((draft) => {
        draft.owners.delete(id);
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
  };
}

function emptyData(): LedgerData {
  return { owners: new Map(), tombstones: [] };
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
      }),
    );
  } catch {}
}

function pairs(value: unknown, key: string): [string, string][] {
  if (typeof value !== "object" || value === null) return [];
  const list: unknown = (value as Record<string, unknown>)[key];
  if (!Array.isArray(list)) return [];
  return list.filter(
    (pair: unknown): pair is [string, string] =>
      Array.isArray(pair) &&
      pair.length === 2 &&
      typeof pair[0] === "string" &&
      typeof pair[1] === "string",
  );
}
