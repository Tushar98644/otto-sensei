import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api/client";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import type { KnownResumes, PutResumeOptions, PutResumeResult, ResumeList } from "./api-types";
import {
  cloudVersions,
  startCloudSync,
  type CloudSync,
  type CloudSyncOptions,
  type SyncApi,
} from "./cloud-sync";
import { createLedger, type LedgerStorage, type SyncLedger } from "./ledger";

const USER = "user-1";
const DEBOUNCE_MS = 5_000;
const RETRY_MS = 5_000;

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

function gate() {
  let open = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { opened, open };
}

// Answers like the resume routes: stale on a base that isn't the account's, ids only when unchanged.
function fakeAccount(initial: Resume[] = []) {
  const cloud = new Map(initial.map((r) => [r.id, structuredClone(r)]));
  const tombstones = new Set<string>();
  const api = {
    listResumes: vi.fn(async (known?: KnownResumes): Promise<ResumeList> => {
      const all = [...cloud.values()];
      const same = (r: Resume) => known?.[r.id] === r.updatedAt;
      return {
        ok: true,
        resumes: all.filter((r) => !same(r)).map((r) => structuredClone(r)),
        deletedIds: [...tombstones],
        unchanged: all.filter(same).map((r) => r.id),
      };
    }),
    putResume: vi.fn(async (next: Resume, options?: PutResumeOptions): Promise<PutResumeResult> => {
      if (tombstones.has(next.id)) return { ok: true, deleted: true };
      const current = cloud.get(next.id);
      if (current && options?.base !== undefined && options.base !== current.updatedAt) {
        return { ok: true, deleted: false, stale: true };
      }
      cloud.set(next.id, structuredClone(next));
      return { ok: true, deleted: false };
    }),
    deleteResume: vi.fn(async (id: string) => {
      if (!cloud.delete(id)) throw new ApiClientError("not_found", "Not found.", 404);
      tombstones.add(id);
      return { ok: true as const };
    }),
  } satisfies SyncApi;
  return { api, cloud, tombstones };
}

const running: CloudSync[] = [];

function start(api: SyncApi, ledger: SyncLedger, more: Partial<CloudSyncOptions> = {}) {
  const sync = startCloudSync({
    userId: USER,
    api,
    store: useStudioStore,
    ledger,
    warn: () => {},
    ...more,
  });
  running.push(sync);
  return sync;
}

const store = () => useStudioStore.getState();
const local = () => store().resumes;

beforeEach(() => {
  vi.useFakeTimers();
  store().clearAll();
});

afterEach(() => {
  for (const sync of running.splice(0)) sync.stop();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("cloudVersions", () => {
  it("takes an unchanged resume at the version the browser sent, and ignores one it never sent", () => {
    const listed: ResumeList = {
      ok: true,
      resumes: [{ ...resume("Newer there", 3_000), id: "listed" }],
      deletedIds: [],
      unchanged: ["same", "never-sent"],
    };
    const versions = cloudVersions(listed, { same: 2_000, listed: 1_000 });
    expect([...versions]).toEqual([
      ["listed", 3_000],
      ["same", 2_000],
    ]);
  });
});

describe("startCloudSync's warnings", () => {
  it("logs to the console under its own name when no warn is given", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { api } = fakeAccount();
    const down = new ApiClientError("server_error", "Down.", 500);
    api.listResumes.mockRejectedValueOnce(down);

    await start(api, createLedger(memoryStorage()), { warn: undefined }).flush();

    expect(warn).toHaveBeenCalledWith("[cloud-sync] couldn't load resumes from the account", down);
  });
});

describe("startCloudSync when nothing needs sending", () => {
  it("sends nothing for a studio change that leaves the resumes alone", async () => {
    store().addResume(resume("Draft", 1_000));
    const { api } = fakeAccount();
    const onBackupChange = vi.fn();
    const sync = start(api, createLedger(memoryStorage()), { onBackupChange });
    await sync.flush();
    api.putResume.mockClear();
    onBackupChange.mockClear();

    store().setStep("tailor");
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

    expect(api.putResume).not.toHaveBeenCalled();
    expect(api.listResumes).toHaveBeenCalledOnce();
    expect(onBackupChange).not.toHaveBeenCalled();
  });

  it("asks the account nothing to flush or refresh once stopped", async () => {
    store().addResume(resume("Draft", 1_000));
    const { api } = fakeAccount();
    const sync = start(api, createLedger(memoryStorage()));
    await sync.flush();
    sync.stop();
    api.listResumes.mockClear();
    api.putResume.mockClear();

    store().updateResume(Object.keys(local())[0]!, (r) => ({ ...r, title: "After sign-out" }));
    await sync.flush();
    await sync.refresh(0);
    sync.leave();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

    expect(api.listResumes).not.toHaveBeenCalled();
    expect(api.putResume).not.toHaveBeenCalled();
  });

  it("asks the account nothing while signed out, even when the page closes", async () => {
    store().addResume(resume("Draft", 1_000));
    const { api } = fakeAccount();
    const sync = start(api, createLedger(memoryStorage()), { userId: null });

    await sync.flush();
    await sync.refresh(0);
    sync.leave();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

    expect(api.listResumes).not.toHaveBeenCalled();
    expect(api.putResume).not.toHaveBeenCalled();
    await expect(sync.firstLoad).resolves.toBeUndefined();
  });

  it("doesn't read the account again when nothing was turned away for want of room", async () => {
    const { api } = fakeAccount();
    const onBackupChange = vi.fn();
    const sync = start(api, createLedger(memoryStorage()), { onBackupChange });
    await sync.flush();
    onBackupChange.mockClear();

    sync.retryRefused();
    await vi.advanceTimersByTimeAsync(0);

    expect(api.listResumes).toHaveBeenCalledOnce();
    expect(onBackupChange).not.toHaveBeenCalled();
  });

  it("sends only the edited resume as the page closes", async () => {
    const edited = resume("Edited", 1_000);
    const untouched = resume("Untouched", 1_000);
    store().addResume(edited);
    store().addResume(untouched);
    const { api } = fakeAccount([edited, untouched]);
    const sync = start(api, createLedger(memoryStorage()));
    await sync.flush();

    store().updateResume(edited.id, (r) => ({ ...r, title: "Edited, last words" }));
    sync.leave();

    expect(api.putResume.mock.calls.map(([sent, options]) => [sent.id, options])).toEqual([
      [edited.id, { base: 1_000, keepalive: true }],
    ]);
  });
});

describe("startCloudSync after it stops", () => {
  it("never retries a read that failed after it stopped", async () => {
    const { api } = fakeAccount();
    const answered = gate();
    api.listResumes.mockImplementationOnce(async () => {
      await answered.opened;
      throw new ApiClientError("server_error", "Down.", 500);
    });
    const sync = start(api, createLedger(memoryStorage()));

    sync.stop();
    answered.open();
    await vi.advanceTimersByTimeAsync(120_000);

    expect(api.listResumes).toHaveBeenCalledOnce();
  });

  it("merges nothing from a read that comes back after it stopped", async () => {
    const theirs = resume("From the account", 2_000);
    const { api } = fakeAccount([theirs]);
    const answered = gate();
    const list = api.listResumes.getMockImplementation()!;
    api.listResumes.mockImplementationOnce(async (known) => {
      await answered.opened;
      return list(known);
    });
    const sync = start(api, createLedger(memoryStorage()));

    sync.stop();
    answered.open();
    await vi.advanceTimersByTimeAsync(0);

    expect(local()[theirs.id]).toBeUndefined();
    expect(api.putResume).not.toHaveBeenCalled();
  });

  it("records nothing from a save answered after it stopped, nor drops a resume it says is gone", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api } = fakeAccount();
    const answered = gate();
    api.putResume.mockImplementationOnce(async () => {
      await answered.opened;
      return { ok: true, deleted: true };
    });
    const ledger = createLedger(memoryStorage());
    const onDeletedElsewhere = vi.fn();
    const sync = start(api, ledger, { onDeletedElsewhere });
    await vi.advanceTimersByTimeAsync(0);
    expect(api.putResume).toHaveBeenCalledOnce();

    sync.stop();
    answered.open();
    await vi.advanceTimersByTimeAsync(0);

    expect(local()[mine.id]?.title).toBe("Draft");
    expect(ledger.syncedAt(mine.id)).toBeUndefined();
    expect(onDeletedElsewhere).not.toHaveBeenCalled();
  });

  it("sends no more uploads once stopped partway through a pass", async () => {
    const first = resume("First", 1_000);
    const second = resume("Second", 2_000);
    store().addResume(first);
    store().addResume(second);
    const { api, cloud } = fakeAccount();
    const put = api.putResume.getMockImplementation()!;
    api.putResume.mockImplementationOnce(async (next, options) => {
      const saved = await put(next, options);
      sync.stop();
      return saved;
    });

    const sync = start(api, createLedger(memoryStorage()));
    await sync.flush();
    await vi.advanceTimersByTimeAsync(120_000);

    expect(api.putResume).toHaveBeenCalledOnce();
    expect(cloud.size).toBe(1);
  });

  it("keeps a deletion it didn't get to send, for the next session", async () => {
    const a = resume("A", 1_000);
    const b = resume("B", 1_000);
    const keep = resume("Keep", 1_000);
    for (const item of [a, b, keep]) store().addResume(item);
    const storage = memoryStorage();
    const { api, cloud } = fakeAccount([a, b, keep]);
    const sync = start(api, createLedger(storage));
    await sync.flush();

    const remove = api.deleteResume.getMockImplementation()!;
    api.deleteResume.mockImplementationOnce(async (id) => {
      const done = await remove(id);
      sync.stop();
      return done;
    });
    store().removeResume(a.id);
    store().removeResume(b.id);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(api.deleteResume).toHaveBeenCalledOnce();
    expect(createLedger(storage).buried(USER)).toHaveLength(1);

    await start(api, createLedger(storage)).flush();
    expect(cloud.has(a.id)).toBe(false);
    expect(cloud.has(b.id)).toBe(false);
    expect(cloud.has(keep.id)).toBe(true);
    expect(createLedger(storage).buried(USER)).toEqual([]);
  });
});

describe("startCloudSync's deletions", () => {
  it("waits out a failed deletion before uploading, then sends both", async () => {
    const old = resume("Old", 1_000);
    store().addResume(old);
    const { api, cloud } = fakeAccount([old]);
    const sync = start(api, createLedger(memoryStorage()));
    await sync.flush();

    api.deleteResume.mockRejectedValueOnce(new ApiClientError("server_error", "Down.", 500));
    store().removeResume(old.id);
    const fresh = resume("Fresh", 2_000);
    store().addResume(fresh);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(api.deleteResume).toHaveBeenCalledOnce();
    expect(api.putResume).not.toHaveBeenCalled();
    expect(sync.backupOf(fresh.id)).toBe("failed");

    await vi.advanceTimersByTimeAsync(RETRY_MS);
    expect(api.deleteResume).toHaveBeenCalledTimes(2);
    expect(cloud.has(old.id)).toBe(false);
    expect(cloud.get(fresh.id)?.title).toBe("Fresh");
    expect(sync.backupOf(fresh.id)).toBe("saved");
  });

  it("takes a deletion the account answers not found as done", async () => {
    const old = resume("Old", 1_000);
    store().addResume(old);
    const { api, cloud } = fakeAccount([old]);
    const ledger = createLedger(memoryStorage());
    await start(api, ledger).flush();

    cloud.delete(old.id);
    store().removeResume(old.id);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await vi.advanceTimersByTimeAsync(120_000);

    expect(api.deleteResume).toHaveBeenCalledOnce();
    expect(ledger.buried(USER)).toEqual([]);
  });

  it("drops a deletion recorded while signed out once the account no longer has the resume", async () => {
    const ledger = createLedger(memoryStorage());
    ledger.bury("deleted-on-the-laptop", USER);
    const { api } = fakeAccount();

    await start(api, ledger).flush();

    expect(api.deleteResume).not.toHaveBeenCalled();
    expect(ledger.buried(USER)).toEqual([]);
  });

  it("still deletes from the account a resume whose owner record another tab cleared", async () => {
    const mine = resume("Mine", 1_000);
    store().addResume(mine);
    const storage = memoryStorage();
    const { api, cloud } = fakeAccount([mine]);
    const sync = start(api, createLedger(storage));
    await sync.flush();

    createLedger(storage).forget([mine.id]);
    await sync.flush();
    store().removeResume(mine.id);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    expect(api.deleteResume).toHaveBeenCalledExactlyOnceWith(mine.id);
    expect(cloud.has(mine.id)).toBe(false);
  });

  it("records no deletion for a resume no account ever had, removed while signed out", async () => {
    const scratch = resume("Made while signed out", 1_000);
    store().addResume(scratch);
    const ledger = createLedger(memoryStorage());
    const { api } = fakeAccount();
    const signedOut = start(api, ledger, { userId: null });

    store().removeResume(scratch.id);
    signedOut.stop();
    await start(api, ledger).flush();

    expect(api.deleteResume).not.toHaveBeenCalled();
    expect(ledger.buried(USER)).toEqual([]);
    expect(ledger.ownerOf(scratch.id)).toBeUndefined();
  });

  it("never uploads a resume deleted while another one was uploading", async () => {
    const first = resume("First", 1_000);
    const second = resume("Second", 2_000);
    store().addResume(first);
    store().addResume(second);
    const { api, cloud } = fakeAccount();
    const answered = gate();
    const put = api.putResume.getMockImplementation()!;
    api.putResume.mockImplementationOnce(async (next, options) => {
      await answered.opened;
      return put(next, options);
    });
    const sync = start(api, createLedger(memoryStorage()));
    await vi.advanceTimersByTimeAsync(0);
    const uploading = api.putResume.mock.calls[0]![0];
    const other = uploading.id === first.id ? second : first;

    store().removeResume(other.id);
    answered.open();
    await sync.flush();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

    expect(api.putResume.mock.calls.map(([sent]) => sent.id)).toEqual([uploading.id]);
    expect([...cloud.keys()]).toEqual([uploading.id]);
  });

  it("says nothing about another device when a save finds a resume already deleted here", async () => {
    const mine = resume("Mine", 1_000);
    const other = resume("Other", 1_000);
    store().addResume(other);
    store().addResume(mine);
    const { api, cloud, tombstones } = fakeAccount([mine, other]);
    const onDeletedElsewhere = vi.fn();
    const sync = start(api, createLedger(memoryStorage()), { onDeletedElsewhere });
    await sync.flush();

    cloud.delete(mine.id);
    tombstones.add(mine.id);
    const answered = gate();
    const put = api.putResume.getMockImplementation()!;
    api.putResume.mockImplementationOnce(async (next, options) => {
      await answered.opened;
      return put(next, options);
    });
    store().updateResume(mine.id, (r) => ({ ...r, title: "Edited" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(api.putResume).toHaveBeenCalledOnce();

    store().removeResume(mine.id);
    answered.open();
    await sync.flush();

    expect(onDeletedElsewhere).not.toHaveBeenCalled();
    expect(local()[mine.id]).toBeUndefined();
    expect(Object.keys(local())).toEqual([other.id]);
  });
});

describe("startCloudSync's failures", () => {
  it("retries after a backoff when a save throws something other than an API error", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api, cloud } = fakeAccount();
    api.putResume.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const warn = vi.fn();
    const sync = start(api, createLedger(memoryStorage()), { warn });

    await sync.flush();
    expect(sync.backupOf(mine.id)).toBe("failed");
    expect(warn).toHaveBeenCalledWith("couldn't back up a resume", expect.any(TypeError));

    await vi.advanceTimersByTimeAsync(RETRY_MS);
    expect(cloud.get(mine.id)?.title).toBe("Draft");
    expect(sync.backupOf(mine.id)).toBe("saved");
  });

  it("shows a retry still in flight as saving, not failed", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api } = fakeAccount();
    api.putResume.mockRejectedValueOnce(new ApiClientError("network_error", "Offline.", 0));
    const sync = start(api, createLedger(memoryStorage()));
    await sync.flush();
    expect(sync.backupOf(mine.id)).toBe("failed");

    const answered = gate();
    const put = api.putResume.getMockImplementation()!;
    api.putResume.mockImplementationOnce(async (next, options) => {
      await answered.opened;
      return put(next, options);
    });
    await vi.advanceTimersByTimeAsync(RETRY_MS);
    expect(api.putResume).toHaveBeenCalledTimes(2);
    expect(sync.backupOf(mine.id)).toBe("saving");

    answered.open();
    await sync.flush();
    expect(sync.backupOf(mine.id)).toBe("saved");
  });

  it("doesn't send a copy again with an ordinary request when keepalive was refused for it", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api } = fakeAccount([mine]);
    const sync = start(api, createLedger(memoryStorage()));
    await sync.flush();

    store().updateResume(mine.id, (r) => ({ ...r, summary: "far too long" }));
    api.putResume.mockRejectedValueOnce(new ApiClientError("too_large", "Too big.", 413));
    sync.leave();
    await vi.advanceTimersByTimeAsync(120_000);

    expect(api.putResume).toHaveBeenCalledOnce();
    expect(api.putResume).toHaveBeenCalledWith(expect.objectContaining({ id: mine.id }), {
      base: 1_000,
      keepalive: true,
    });
    expect(sync.backupOf(mine.id)).toBe("local");
  });

  it("gives up the pass on a malformed account list, and tries again on the next edit", async () => {
    const mine = resume("Draft", 1_000);
    store().addResume(mine);
    const { api, cloud } = fakeAccount();
    api.listResumes.mockResolvedValueOnce({ ok: true } as unknown as ResumeList);
    const warn = vi.fn();
    const sync = start(api, createLedger(memoryStorage()), { warn });

    await sync.flush();
    expect(warn).toHaveBeenCalledWith("stopped on an unexpected error", expect.any(TypeError));
    expect(cloud.has(mine.id)).toBe(false);
    expect(sync.isStopped()).toBe(false);

    store().updateResume(mine.id, (r) => ({ ...r, title: "Edited" }));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(api.listResumes).toHaveBeenCalledTimes(2);
    expect(cloud.get(mine.id)?.title).toBe("Edited");
  });
});
