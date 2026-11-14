import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api/client";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import type { KnownResumes, PutResumeOptions, ResumeList } from "./api-types";
import {
  knownVersions,
  releaseBackedUp,
  startCloudSync,
  type CloudSync,
  type CloudSyncOptions,
  type DeletedElsewhere,
  type SyncApi,
} from "./cloud-sync";
import { createLedger, type LedgerStorage, type SyncLedger } from "./ledger";

const tab = vi.hoisted(() => ({ elsewhere: false }));
vi.mock("@/lib/store/studio-storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/store/studio-storage")>()),
  isApplyingAnotherTab: () => tab.elsewhere,
}));

const USER = "user-1";
const DEBOUNCE_MS = 5_000;

function inAnotherTab(change: () => void) {
  tab.elsewhere = true;
  try {
    change();
  } finally {
    tab.elsewhere = false;
  }
}

function memoryStorage(): LedgerStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

function resume(title: string, updatedAt: number): Resume {
  return { ...emptyResume(updatedAt), title };
}

function fakeAccount(initial: Resume[] = [], deleted: string[] = []) {
  const cloud = new Map(initial.map((r) => [r.id, structuredClone(r)]));
  const tombstones = new Set(deleted);
  const failures: Partial<Record<keyof SyncApi, ApiClientError>> = {};
  const takeFailure = (name: keyof SyncApi) => {
    const failure = failures[name];
    delete failures[name];
    if (failure) throw failure;
  };
  // Like the route: resumes at the version the browser named come back as ids only.
  const api = {
    listResumes: vi.fn(async (known?: KnownResumes): Promise<ResumeList> => {
      takeFailure("listResumes");
      const all = [...cloud.values()];
      const same = (r: Resume) => known?.[r.id] === r.updatedAt;
      return {
        ok: true as const,
        resumes: all.filter((r) => !same(r)).map((r) => structuredClone(r)),
        deletedIds: [...tombstones],
        unchanged: all.filter(same).map((r) => r.id),
      };
    }),
    putResume: vi.fn(async (next: Resume, options?: PutResumeOptions) => {
      takeFailure("putResume");
      if (tombstones.has(next.id)) return { ok: true as const, deleted: true };
      const current = cloud.get(next.id);
      const base = options?.base;
      if (current?.updatedAt === next.updatedAt) return { ok: true as const, deleted: false };
      if (current && (next.updatedAt < current.updatedAt || (base !== undefined && base !== current.updatedAt))) {
        return { ok: true as const, deleted: false, stale: true };
      }
      cloud.set(next.id, structuredClone(next));
      return { ok: true as const, deleted: false };
    }),
    deleteResume: vi.fn(async (id: string) => {
      takeFailure("deleteResume");
      if (!cloud.delete(id)) throw new ApiClientError("not_found", "Not found.", 404);
      tombstones.add(id);
      return { ok: true as const };
    }),
  } satisfies SyncApi;
  const queueFailure = (name: keyof SyncApi, error: ApiClientError) => {
    failures[name] = error;
  };
  const deleteElsewhere = (id: string) => {
    cloud.delete(id);
    tombstones.add(id);
  };
  return { api, cloud, tombstones, queueFailure, deleteElsewhere };
}

const running: CloudSync[] = [];

function start(
  api: SyncApi,
  ledger: SyncLedger,
  userId: string | null = USER,
  onSessionExpired?: () => void,
  onDeletedElsewhere?: (detail: DeletedElsewhere) => void,
  more: Partial<CloudSyncOptions> = {},
) {
  const sync = startCloudSync({
    userId,
    api,
    store: useStudioStore,
    ledger,
    onSessionExpired,
    onDeletedElsewhere,
    warn: () => {},
    ...more,
  });
  running.push(sync);
  return sync;
}

const local = () => useStudioStore.getState().resumes;
const store = () => useStudioStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  store().clearAll();
});

afterEach(() => {
  for (const sync of running.splice(0)) sync.stop();
  vi.useRealTimers();
});

describe("startCloudSync", () => {
  it("merges the account into the browser and uploads what the account lacks", async () => {
    const mine = resume("Local", 1_000);
    const theirs = resume("From the cloud", 2_000);
    const same = resume("Same everywhere", 3_000);
    store().addResume(mine);
    store().addResume(same);
    const { api, cloud } = fakeAccount([theirs, same]);

    await start(api, createLedger(memoryStorage())).flush();

    expect(local()[theirs.id]?.title).toBe("From the cloud");
    expect(cloud.get(mine.id)?.title).toBe("Local");
    expect(api.putResume).toHaveBeenCalledTimes(1);
  });

  it("uploads an edit once, after a quiet period", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api, cloud } = fakeAccount();
    await start(api, createLedger(memoryStorage())).flush();
    api.putResume.mockClear();

    store().updateResume(mine.id, (r) => ({ ...r, title: "One" }));
    await vi.advanceTimersByTimeAsync(2_000);
    store().updateResume(mine.id, (r) => ({ ...r, title: "Two" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1_000);
    expect(api.putResume).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_100);
    expect(api.putResume).toHaveBeenCalledTimes(1);
    expect(cloud.get(mine.id)?.title).toBe("Two");
  });

  it("uploads within the longest wait even while the typing never pauses", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api, cloud } = fakeAccount();
    await start(api, createLedger(memoryStorage())).flush();
    api.putResume.mockClear();

    for (let i = 0; i < 31; i++) {
      store().updateResume(mine.id, (r) => ({ ...r, title: `Draft ${i}` }));
      await vi.advanceTimersByTimeAsync(1_000);
    }

    expect(api.putResume).toHaveBeenCalledTimes(1);
    expect(cloud.get(mine.id)?.title).toBe("Draft 29");
  });

  it("sends nothing for an edit that changes nothing", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api } = fakeAccount();
    await start(api, createLedger(memoryStorage())).flush();
    api.putResume.mockClear();

    store().updateResume(mine.id, (r) => r);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

    expect(api.putResume).not.toHaveBeenCalled();
    expect(store().resumes[mine.id]?.updatedAt).toBe(1_000);
  });

  it("backs up a renamed resume and a duplicate like any other edit", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api, cloud } = fakeAccount();
    await start(api, createLedger(memoryStorage())).flush();
    api.putResume.mockClear();

    store().renameResume(mine.id, "Design roles");
    const copyId = store().duplicateResume(mine.id)!;
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(api.putResume).toHaveBeenCalledTimes(2);
    expect(cloud.get(mine.id)?.title).toBe("Design roles");
    expect(cloud.get(copyId)?.title).toBe("Design roles (copy)");
  });

  it("deletes a removed resume from the account", async () => {
    const mine = resume("Old", 1_000);
    store().addResume(mine);
    const { api, cloud } = fakeAccount();
    const ledger = createLedger(memoryStorage());
    await start(api, ledger).flush();

    store().removeResume(mine.id);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(api.deleteResume).toHaveBeenCalledWith(mine.id);
    expect(cloud.has(mine.id)).toBe(false);
    expect(ledger.buried(USER)).toEqual([]);
  });

  it("never deletes cloud copies when the whole browser copy is cleared", async () => {
    store().addResume(resume("A", 1_000));
    store().addResume(resume("B", 1_000));
    const { api, cloud } = fakeAccount();
    await start(api, createLedger(memoryStorage())).flush();

    store().clearAll();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(api.deleteResume).not.toHaveBeenCalled();
    expect(cloud.size).toBe(2);
  });

  it("doesn't upload a resume that belongs to another account", async () => {
    const someoneElses = resume("Not mine", 1_000);
    store().addResume(someoneElses);
    const ledger = createLedger(memoryStorage());
    ledger.claim([someoneElses.id], "user-2");
    const { api } = fakeAccount();

    await start(api, ledger).flush();
    store().removeResume(someoneElses.id);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(api.putResume).not.toHaveBeenCalled();
    expect(api.deleteResume).not.toHaveBeenCalled();
    expect(ledger.buried("user-2")).toEqual([]);
  });

  it("sends nothing while signed out, then applies the deletion after sign-in", async () => {
    const mine = resume("Synced earlier", 1_000);
    store().addResume(mine);
    const ledger = createLedger(memoryStorage());
    ledger.claim([mine.id], USER);
    const { api, cloud } = fakeAccount([mine]);

    const signedOut = start(api, ledger, null);
    store().removeResume(mine.id);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(api.listResumes).not.toHaveBeenCalled();
    expect(api.deleteResume).not.toHaveBeenCalled();
    signedOut.stop();

    await start(api, ledger).flush();
    expect(local()[mine.id]).toBeUndefined();
    expect(cloud.has(mine.id)).toBe(false);
  });

  it("stops and reports an expired session", async () => {
    store().addResume(resume("Draft", 1_000));
    const { api, queueFailure } = fakeAccount();
    queueFailure("listResumes", new ApiClientError("unauthorized", "Sign in.", 401));
    const onSessionExpired = vi.fn();

    await start(api, createLedger(memoryStorage()), USER, onSessionExpired).flush();
    store().addResume(resume("Another", 2_000));
    await vi.advanceTimersByTimeAsync(120_000);

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(api.listResumes).toHaveBeenCalledTimes(1);
    expect(api.putResume).not.toHaveBeenCalled();
  });

  it("reads the account again on refresh only once the last read is old enough", async () => {
    const { api, cloud } = fakeAccount();
    const sync = start(api, createLedger(memoryStorage()));
    await sync.firstLoad;

    await sync.refresh(300_000);
    expect(api.listResumes).toHaveBeenCalledTimes(1);

    const later = resume("Made on another device", 5_000);
    cloud.set(later.id, later);
    await vi.advanceTimersByTimeAsync(300_000);
    await sync.refresh(300_000);

    expect(api.listResumes).toHaveBeenCalledTimes(2);
    expect(local()[later.id]?.title).toBe("Made on another device");
    expect(sync.isStopped()).toBe(false);
    sync.stop();
    expect(sync.isStopped()).toBe(true);
  });

  it("retries a failed upload on the next change", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api, cloud, queueFailure } = fakeAccount();
    queueFailure("putResume", new ApiClientError("network_error", "Offline.", 0));

    await start(api, createLedger(memoryStorage())).flush();
    expect(cloud.has(mine.id)).toBe(false);

    store().updateResume(mine.id, (r) => ({ ...r, title: "Edited" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(cloud.get(mine.id)?.title).toBe("Edited");
  });

  it("retries after a backoff when nothing else changes", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api, cloud, queueFailure } = fakeAccount();
    queueFailure("listResumes", new ApiClientError("server_error", "Down.", 500));

    await start(api, createLedger(memoryStorage())).flush();
    expect(cloud.has(mine.id)).toBe(false);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(cloud.has(mine.id)).toBe(true);
  });

  it("skips a version the server refused until it changes", async () => {
    const mine = resume("Too big", 1_000);
    store().addResume(mine);
    const { api, cloud, queueFailure } = fakeAccount();
    queueFailure("putResume", new ApiClientError("bad_request", "Invalid.", 400));

    await start(api, createLedger(memoryStorage())).flush();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(api.putResume).toHaveBeenCalledTimes(1);

    store().updateResume(mine.id, (r) => ({ ...r, title: "Fixed" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(api.putResume).toHaveBeenCalledTimes(2);
    expect(cloud.get(mine.id)?.title).toBe("Fixed");
  });
});

describe("startCloudSync with deletions from another device", () => {
  it("drops local copies the account deleted and never uploads them", async () => {
    const deletedThere = resume("Deleted on the laptop", 1_000);
    const kept = resume("Kept", 1_000);
    store().addResume(deletedThere);
    store().addResume(kept);
    store().updateResume(deletedThere.id, (r) => ({ ...r, title: "Edited offline" }));
    const ledger = createLedger(memoryStorage());
    ledger.claim([deletedThere.id, kept.id], USER);
    const { api, cloud } = fakeAccount([kept], [deletedThere.id]);
    const onDeletedElsewhere = vi.fn();

    const sync = start(api, ledger, USER, undefined, onDeletedElsewhere);
    await sync.flush();
    await vi.advanceTimersByTimeAsync(120_000);

    expect(local()[deletedThere.id]).toBeUndefined();
    expect(Object.keys(local())).toEqual([kept.id]);
    expect(cloud.has(deletedThere.id)).toBe(false);
    expect(api.putResume).not.toHaveBeenCalled();
    expect(api.deleteResume).not.toHaveBeenCalled();
    expect(ledger.ownerOf(deletedThere.id)).toBeUndefined();
    expect(ledger.buried(USER)).toEqual([]);
    expect(onDeletedElsewhere).toHaveBeenCalledExactlyOnceWith({ ids: [deletedThere.id], wasActive: false });
  });

  it("says when the open resume was the one deleted", async () => {
    const other = resume("Other", 1_000);
    const open = resume("Open", 1_000);
    store().addResume(other);
    store().addResume(open);
    const { api } = fakeAccount([other], [open.id]);
    const onDeletedElsewhere = vi.fn();

    await start(api, createLedger(memoryStorage()), USER, undefined, onDeletedElsewhere).flush();

    expect(onDeletedElsewhere).toHaveBeenCalledExactlyOnceWith({ ids: [open.id], wasActive: true });
    expect(store().activeId).toBe(other.id);
  });

  it("drops its copy when a save comes back as deleted, without deleting it again", async () => {
    const mine = resume("Shared", 1_000);
    const other = resume("Other", 1_000);
    store().addResume(other);
    store().addResume(mine);
    const { api, cloud, deleteElsewhere } = fakeAccount([mine, other]);
    const onDeletedElsewhere = vi.fn();
    const ledger = createLedger(memoryStorage());
    await start(api, ledger, USER, undefined, onDeletedElsewhere).flush();
    expect(api.putResume).not.toHaveBeenCalled();

    deleteElsewhere(mine.id);
    store().updateResume(mine.id, (r) => ({ ...r, title: "Edited after the delete" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(api.putResume).toHaveBeenCalledTimes(1);
    expect(local()[mine.id]).toBeUndefined();
    expect(cloud.has(mine.id)).toBe(false);
    expect(onDeletedElsewhere).toHaveBeenCalledExactlyOnceWith({ ids: [mine.id], wasActive: true });
    expect(store().activeId).toBe(other.id);

    await vi.advanceTimersByTimeAsync(120_000);
    expect(api.putResume).toHaveBeenCalledTimes(1);
    expect(api.deleteResume).not.toHaveBeenCalled();
    expect(ledger.buried(USER)).toEqual([]);
  });

  it("leaves another account's resume alone even if its id is listed as deleted", async () => {
    const someoneElses = resume("Not mine", 1_000);
    store().addResume(someoneElses);
    const ledger = createLedger(memoryStorage());
    ledger.claim([someoneElses.id], "user-2");
    const { api } = fakeAccount([], [someoneElses.id]);

    await start(api, ledger).flush();

    expect(local()[someoneElses.id]?.title).toBe("Not mine");
    expect(ledger.ownerOf(someoneElses.id)).toBe("user-2");
  });

  it("still syncs with a server that sends no deletedIds", async () => {
    const mine = resume("Local", 1_000);
    store().addResume(mine);
    const { api, cloud } = fakeAccount();
    api.listResumes.mockImplementationOnce(
      async () => ({ ok: true, resumes: [] }) as unknown as Awaited<ReturnType<SyncApi["listResumes"]>>,
    );

    await start(api, createLedger(memoryStorage())).flush();

    expect(cloud.get(mine.id)?.title).toBe("Local");
  });
});

describe("releaseBackedUp", () => {
  it("takes the account's backed-up resumes out of the browser and keeps everything else", async () => {
    const synced = resume("Backed up", 1_000);
    const edited = resume("Edited since the backup", 3_000);
    const someoneElses = resume("Another account's", 1_000);
    const unowned = resume("Made while signed out", 1_000);
    for (const item of [synced, edited, someoneElses, unowned]) store().addResume(item);
    const ledger = createLedger(memoryStorage());
    ledger.claim([synced.id, edited.id], USER);
    ledger.claim([someoneElses.id], "user-2");
    const cloud = new Map([
      [synced.id, 1_000],
      [edited.id, 2_000],
    ]);

    const result = releaseBackedUp({ userId: USER, store: useStudioStore, ledger, cloud });

    expect(result).toEqual({ removed: [synced.id], kept: [edited.id] });
    expect(Object.keys(local()).sort()).toEqual([edited.id, someoneElses.id, unowned.id].sort());
    expect(ledger.ownerOf(synced.id)).toBeUndefined();
    expect(ledger.buried(USER)).toEqual([]);
  });

  it("keeps a copy with edits the account never got, even when the account's copy is newer", () => {
    const edited = resume("Edited offline", 2_000);
    const untouched = resume("Not edited here", 1_000);
    store().addResume(edited);
    store().addResume(untouched);
    const ledger = createLedger(memoryStorage());
    ledger.claim([edited.id, untouched.id], USER);
    ledger.markSynced([
      [edited.id, 1_000],
      [untouched.id, 1_000],
    ]);
    const cloud = new Map([
      [edited.id, 3_000],
      [untouched.id, 3_000],
    ]);

    const result = releaseBackedUp({ userId: USER, store: useStudioStore, ledger, cloud });

    expect(result).toEqual({ removed: [untouched.id], kept: [edited.id] });
  });

  it("is never sent to the account as a deletion, even by a sync started just before", async () => {
    const only = resume("The only one", 1_000);
    const storage = memoryStorage();
    const { api, cloud } = fakeAccount([only]);
    await start(api, createLedger(storage)).flush();
    expect(local()[only.id]).toBeDefined();
    for (const sync of running.splice(0)) sync.stop();

    start(api, createLedger(storage), null);
    const listed = await api.listResumes();
    const versions = new Map(listed.resumes.map((r) => [r.id, r.updatedAt]));
    releaseBackedUp({ userId: USER, store: useStudioStore, ledger: createLedger(storage), cloud: versions });
    expect(local()[only.id]).toBeUndefined();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(createLedger(storage).buried(USER)).toEqual([]);

    for (const sync of running.splice(0)) sync.stop();
    await start(api, createLedger(storage)).flush();
    expect(api.deleteResume).not.toHaveBeenCalled();
    expect(cloud.has(only.id)).toBe(true);
    expect(local()[only.id]?.title).toBe("The only one");
  });
});

describe("startCloudSync with other tabs", () => {
  it("never deletes from the account what another tab took out of the browser", async () => {
    const released = resume("Released in another tab", 1_000);
    store().addResume(released);
    const { api, cloud } = fakeAccount([released]);
    const ledger = createLedger(memoryStorage());
    await start(api, ledger).flush();

    inAnotherTab(() => store().removeResume(released.id));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

    expect(api.deleteResume).not.toHaveBeenCalled();
    expect(ledger.buried(USER)).toEqual([]);
    expect(ledger.ownerOf(released.id)).toBeUndefined();
    expect(cloud.has(released.id)).toBe(true);
  });

  it("leaves another tab's edits to that tab, and skips a copy it already backed up", async () => {
    const mine = resume("Draft", 1_000);
    const other = resume("Other", 1_000);
    store().addResume(mine);
    store().addResume(other);
    const { api } = fakeAccount([mine, other]);
    const ledger = createLedger(memoryStorage());
    await start(api, ledger).flush();

    inAnotherTab(() => store().updateResume(mine.id, (r) => ({ ...r, title: "Edited there" })));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
    expect(api.putResume).not.toHaveBeenCalled();

    ledger.markSynced([[mine.id, store().resumes[mine.id]!.updatedAt]]);
    store().updateResume(other.id, (r) => ({ ...r, title: "Edited here" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(api.putResume.mock.calls.map(([sent]) => sent.id)).toEqual([other.id]);
  });
});

describe("startCloudSync's first load", () => {
  it("is done once the account is read, while uploads carry on behind it", async () => {
    store().addResume(resume("Not uploaded yet", 1_000));
    const { api } = fakeAccount();
    api.putResume.mockImplementationOnce(() => new Promise(() => {}));
    const sync = start(api, createLedger(memoryStorage()));

    let done = false;
    void sync.firstLoad.then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(done).toBe(true);
    expect(api.putResume).toHaveBeenCalledOnce();
  });

  it("is done when the account can't be read, and when the sync stops", async () => {
    const { api, queueFailure } = fakeAccount();
    queueFailure("listResumes", new ApiClientError("server_error", "Down.", 500));
    await expect(start(api, createLedger(memoryStorage())).firstLoad).resolves.toBeUndefined();

    api.listResumes.mockImplementationOnce(() => new Promise(() => {}));
    const stopped = start(api, createLedger(memoryStorage()));
    stopped.stop();
    await expect(stopped.firstLoad).resolves.toBeUndefined();
  });

  it("sends the versions it holds, and needs no upload for ones the account matches", async () => {
    const same = resume("Same", 1_000);
    const changed = resume("Changed elsewhere", 1_000);
    store().addResume(same);
    store().addResume(changed);
    const { api } = fakeAccount([same, { ...changed, title: "Newer", updatedAt: 2_000 }]);

    await start(api, createLedger(memoryStorage())).flush();

    expect(api.listResumes).toHaveBeenCalledWith({ [same.id]: 1_000, [changed.id]: 1_000 });
    expect(local()[changed.id]?.title).toBe("Newer");
    expect(api.putResume).not.toHaveBeenCalled();
  });
});

describe("startCloudSync when the account has no room", () => {
  it("doesn't send a refused resume again on every edit, only once room may have opened", async () => {
    const extra = resume("Second resume", 1_000);
    const old = resume("Old", 1_000);
    store().addResume(old);
    store().addResume(extra);
    const { api, queueFailure } = fakeAccount([old]);
    queueFailure("putResume", new ApiClientError("upgrade_required", "Try Pro.", 402));
    const sync = start(api, createLedger(memoryStorage()));
    await sync.flush();
    expect(api.putResume).toHaveBeenCalledOnce();

    store().updateResume(extra.id, (r) => ({ ...r, title: "Edited" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(api.putResume).toHaveBeenCalledOnce();

    queueFailure("putResume", new ApiClientError("limit_reached", "Full.", 429));
    sync.retryRefused();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.putResume).toHaveBeenCalledTimes(2);

    store().removeResume(old.id);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(api.deleteResume).toHaveBeenCalledWith(old.id);
    expect(api.putResume).toHaveBeenCalledTimes(3);
    expect(api.putResume).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: extra.id, title: "Edited" }),
      { base: undefined },
    );
  });
});

describe("startCloudSync as the page closes", () => {
  it("sends unsaved edits at once with keepalive, and not again after the pause", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api, cloud } = fakeAccount([mine]);
    const sync = start(api, createLedger(memoryStorage()));
    await sync.flush();

    store().updateResume(mine.id, (r) => ({ ...r, title: "Last words" }));
    sync.leave();
    expect(api.putResume).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ title: "Last words" }),
      { base: 1_000, keepalive: true },
    );

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
    expect(cloud.get(mine.id)?.title).toBe("Last words");
    expect(api.putResume).toHaveBeenCalledOnce();
  });

  it("keeps keepalive within its allowance and falls back to an ordinary request", async () => {
    const small = resume("Small", 1_000);
    const big = { ...resume("Big", 1_000), summary: "x".repeat(70_000) };
    store().addResume(small);
    store().addResume(big);
    const { api, queueFailure } = fakeAccount([small, big]);
    const sync = start(api, createLedger(memoryStorage()));
    await sync.flush();

    store().updateResume(small.id, (r) => ({ ...r, title: "Small, edited" }));
    store().updateResume(big.id, (r) => ({ ...r, title: "Big, edited" }));
    queueFailure("putResume", new ApiClientError("network_error", "Refused.", 0));
    sync.leave();
    await vi.advanceTimersByTimeAsync(0);

    const sent = api.putResume.mock.calls.map(([resume, options]) => [resume.title, options]);
    expect(sent).toEqual([
      ["Small, edited", { base: 1_000, keepalive: true }],
      ["Big, edited", { base: 1_000 }],
      ["Small, edited", { base: 1_000 }],
    ]);
  });

  it("sends again with keepalive a save still out when the page hides", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api } = fakeAccount([mine]);
    const sync = start(api, createLedger(memoryStorage()));
    await sync.flush();

    api.putResume.mockImplementationOnce(() => new Promise(() => {}));
    store().updateResume(mine.id, (r) => ({ ...r, title: "Typed" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(api.putResume).toHaveBeenCalledOnce();

    sync.leave();
    expect(api.putResume).toHaveBeenCalledTimes(2);
    expect(api.putResume).toHaveBeenLastCalledWith(expect.objectContaining({ title: "Typed" }), {
      base: 1_000,
      keepalive: true,
    });
  });

  it("takes a copy that arrives twice as saved, without reading the account again", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api, cloud } = fakeAccount([mine]);
    const sync = start(api, createLedger(memoryStorage()));
    await sync.flush();

    // Both requests wait, so the first lands before the second, which names the same base.
    const send = api.putResume.getMockImplementation()!;
    let open = () => {};
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    api.putResume.mockImplementation(async (next, options) => {
      await gate;
      return send(next, options);
    });
    store().updateResume(mine.id, (r) => ({ ...r, title: "Typed" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    sync.leave();
    open();
    await vi.advanceTimersByTimeAsync(0);
    await sync.flush();

    expect(api.putResume).toHaveBeenCalledTimes(2);
    expect(api.listResumes).toHaveBeenCalledOnce();
    expect(cloud.get(mine.id)?.title).toBe("Typed");
  });

  it("still sends what changed while the account is being read again", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api } = fakeAccount([mine]);
    const sync = start(api, createLedger(memoryStorage()));
    await sync.flush();

    api.listResumes.mockImplementationOnce(() => new Promise(() => {}));
    void sync.refresh(0);
    store().updateResume(mine.id, (r) => ({ ...r, title: "Typed" }));
    sync.leave();

    expect(api.putResume).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ title: "Typed" }),
      { base: 1_000, keepalive: true },
    );
  });

  it("tries the account at once, without waiting out a backoff, when it was never read", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api, cloud, queueFailure } = fakeAccount();
    queueFailure("listResumes", new ApiClientError("server_error", "Down.", 500));
    const sync = start(api, createLedger(memoryStorage()));
    await sync.flush();
    expect(cloud.has(mine.id)).toBe(false);

    sync.leave();
    await vi.advanceTimersByTimeAsync(0);

    expect(api.listResumes).toHaveBeenCalledTimes(2);
    expect(api.putResume).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: mine.id }), {
      base: undefined,
    });
    expect(cloud.has(mine.id)).toBe(true);
  });
});

describe("knownVersions", () => {
  it("leaves out a copy the route would turn the whole list away for", () => {
    const fine = resume("Fine", 1_000);
    const odd = { ...resume("Odd", 1_000), updatedAt: 1_000.5 };
    const long = { ...resume("Long id", 1_000), id: "x".repeat(65) };
    expect(knownVersions([fine, odd, long], () => true)).toEqual({ [fine.id]: 1_000 });
  });

  it("sends nothing to compare once there are too many, so the account lists them all", () => {
    const many = Array.from({ length: 201 }, (_, i) => resume(`CV ${i}`, 1_000 + i));
    expect(knownVersions(many, () => true)).toEqual({});
    expect(Object.keys(knownVersions(many.slice(0, 200), () => true))).toHaveLength(200);
  });
});

describe("startCloudSync with edits on two devices", () => {
  it("keeps the other device's copy as a version when its save turns out stale", async () => {
    const cv = resume("CV", 1_000);
    store().addResume(cv);
    const { api, cloud } = fakeAccount([cv]);
    const onConflict = vi.fn();
    const sync = start(api, createLedger(memoryStorage()), USER, undefined, undefined, { onConflict });
    await sync.flush();

    cloud.set(cv.id, { ...cv, title: "Edited on the laptop", updatedAt: 2_000 });
    store().updateResume(cv.id, (r) => ({ ...r, title: "Edited on the phone" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(cloud.get(cv.id)?.title).toBe("Edited on the laptop");

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(onConflict).toHaveBeenCalledExactlyOnceWith([cv.id]);
    expect(cloud.get(cv.id)?.title).toBe("Edited on the phone");
    const [kept] = store().versions[cv.id] ?? [];
    expect(kept?.name).toBe("Edits from another device");
    expect(kept?.resume.title).toBe("Edited on the laptop");
  });

  it("doesn't take its own save, whose answer was lost, for another device's edit", async () => {
    const cv = resume("CV", 1_000);
    store().addResume(cv);
    const { api, cloud } = fakeAccount([cv]);
    const onConflict = vi.fn();
    const sync = start(api, createLedger(memoryStorage()), USER, undefined, undefined, { onConflict });
    await sync.flush();

    const send = api.putResume.getMockImplementation()!;
    api.putResume.mockImplementationOnce(async (next, options) => {
      await send(next, options);
      throw new ApiClientError("network_error", "The answer never came.", 0);
    });
    store().updateResume(cv.id, (r) => ({ ...r, title: "First" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(cloud.get(cv.id)?.title).toBe("First");

    store().updateResume(cv.id, (r) => ({ ...r, title: "Second" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 3);

    expect(onConflict).not.toHaveBeenCalled();
    expect(store().versions[cv.id]).toBeUndefined();
    expect(cloud.get(cv.id)?.title).toBe("Second");
  });

  it("keeps this device's edit as a version when the other device's copy is newer", async () => {
    const cv = resume("CV", 1_000);
    store().addResume(cv);
    const { api, cloud } = fakeAccount([cv]);
    await start(api, createLedger(memoryStorage())).flush();

    cloud.set(cv.id, { ...cv, title: "From a clock running ahead", updatedAt: Date.now() + 60 * 60_000 });
    store().updateResume(cv.id, (r) => ({ ...r, title: "Edited here" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

    expect(local()[cv.id]?.title).toBe("From a clock running ahead");
    expect(store().versions[cv.id]?.[0]?.name).toBe("Edits on this device");
    expect(store().versions[cv.id]?.[0]?.resume.title).toBe("Edited here");
    expect(cloud.get(cv.id)?.title).toBe("From a clock running ahead");
  });
});
