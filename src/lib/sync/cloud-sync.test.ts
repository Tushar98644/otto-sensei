import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api/client";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import {
  releaseBackedUp,
  startCloudSync,
  type CloudSync,
  type DeletedElsewhere,
  type SyncApi,
} from "./cloud-sync";
import { createLedger, type LedgerStorage, type SyncLedger } from "./ledger";

const USER = "user-1";

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
  const api = {
    listResumes: vi.fn(async () => {
      takeFailure("listResumes");
      return {
        ok: true as const,
        resumes: [...cloud.values()].map((r) => structuredClone(r)),
        deletedIds: [...tombstones],
      };
    }),
    putResume: vi.fn(async (next: Resume) => {
      takeFailure("putResume");
      if (tombstones.has(next.id)) return { ok: true as const, deleted: true };
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
) {
  const sync = startCloudSync({
    userId,
    api,
    store: useStudioStore,
    ledger,
    onSessionExpired,
    onDeletedElsewhere,
    warn: () => {},
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
    await vi.advanceTimersByTimeAsync(500);
    store().updateResume(mine.id, (r) => ({ ...r, title: "Two" }));
    await vi.advanceTimersByTimeAsync(1_000);
    expect(api.putResume).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(600);
    expect(api.putResume).toHaveBeenCalledTimes(1);
    expect(cloud.get(mine.id)?.title).toBe("Two");
  });

  it("backs up a renamed resume and a duplicate like any other edit", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api, cloud } = fakeAccount();
    await start(api, createLedger(memoryStorage())).flush();
    api.putResume.mockClear();

    store().renameResume(mine.id, "Design roles");
    const copyId = store().duplicateResume(mine.id)!;
    await vi.advanceTimersByTimeAsync(1_500);

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
    await vi.advanceTimersByTimeAsync(1_500);

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
    await vi.advanceTimersByTimeAsync(1_500);

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
    await sync.firstPass;

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
    await vi.advanceTimersByTimeAsync(1_500);
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
    await vi.advanceTimersByTimeAsync(1_500);
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
    await vi.advanceTimersByTimeAsync(1_500);

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
    const cloud = [synced, { ...edited, updatedAt: 2_000 }];

    const result = releaseBackedUp({ userId: USER, store: useStudioStore, ledger, cloud });

    expect(result).toEqual({ removed: [synced.id], kept: [edited.id] });
    expect(Object.keys(local()).sort()).toEqual([edited.id, someoneElses.id, unowned.id].sort());
    expect(ledger.ownerOf(synced.id)).toBeUndefined();
    expect(ledger.buried(USER)).toEqual([]);
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
    releaseBackedUp({ userId: USER, store: useStudioStore, ledger: createLedger(storage), cloud: listed.resumes });
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
