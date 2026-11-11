import { isApiError, type ApiClientError } from "@/lib/api/client";
import type { EmptyOk, PutResumeResponse, ResumesResponse } from "@/lib/api/types";
import type { Resume } from "@/lib/resume/schema";
import type { SyncLedger } from "./ledger";

// The browser copy stays the source of truth: the cloud is read once per session, then changes are
// pushed after a quiet period, one request at a time with backoff. The one exception: a deletion
// made on another device leaves a tombstone, and this browser drops its copy instead of
// re-uploading.

export type SyncApi = {
  listResumes: () => Promise<ResumesResponse>;
  putResume: (resume: Resume) => Promise<PutResumeResponse>;
  deleteResume: (id: string) => Promise<EmptyOk>;
};

export type SyncStoreState = {
  resumes: Record<string, Resume>;
  activeId: string | null;
  mergeFromCloud: (cloud: Resume[], deletedIds?: readonly string[]) => Resume[];
  removeResume: (id: string) => void;
};

export type DeletedElsewhere = {
  // Dropped because another device deleted them from the account.
  ids: string[];
  wasActive: boolean;
};

export type SyncStore = {
  getState: () => SyncStoreState;
  subscribe: (listener: (state: SyncStoreState, prev: SyncStoreState) => void) => () => void;
};

export type CloudSyncOptions = {
  // null while signed out: nothing is sent, but deletions are still recorded for after sign-in.
  userId: string | null;
  api: SyncApi;
  store: SyncStore;
  ledger: SyncLedger;
  debounceMs?: number;
  // Expired, or signed out in another tab.
  onSessionExpired?: () => void;
  onDeletedElsewhere?: (detail: DeletedElsewhere) => void;
  warn?: (message: string, error?: unknown) => void;
};

export type CloudSync = {
  // Resolves once idle or after a failure; never rejects.
  flush: () => Promise<void>;
  // Re-reads the account when the last read is older than maxAgeMs, then flushes.
  refresh: (maxAgeMs: number) => Promise<void>;
  stop: () => void;
  isStopped: () => boolean;
  // Settles once the first read merged or failed; at once when signed out.
  firstPass: Promise<void>;
};

// Checked by every sync instance in the tab, so none sends these removals as deletions.
let releasing = false;

const DEFAULT_DEBOUNCE_MS = 1_500;
const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 60_000;

// Resending can't fix these, so that version is skipped until it changes. upgrade_required: a
// resume past Free's limit made elsewhere; it stays in this browser only.
const REFUSED: ReadonlySet<ApiClientError["code"]> = new Set<ApiClientError["code"]>([
  "bad_request",
  "too_large",
  "unsupported_type",
  "limit_reached",
  "upgrade_required",
]);

function defaultWarn(message: string, error?: unknown) {
  console.warn(`[cloud-sync] ${message}`, error ?? "");
}

export type ReleaseOptions = {
  userId: string;
  store: SyncStore;
  ledger: SyncLedger;
  cloud: readonly Resume[];
};

// On sign-out, so the next person on a shared computer can't open them. Only resumes whose cloud
// copy is at least as new go; unfinished backups stay. These are not deletions.
export function releaseBackedUp({ userId, store, ledger, cloud }: ReleaseOptions): {
  removed: string[];
  kept: string[];
} {
  const backedUp = new Map(cloud.map((resume) => [resume.id, resume.updatedAt]));
  const removed: string[] = [];
  const kept: string[] = [];
  for (const resume of Object.values(store.getState().resumes)) {
    if (ledger.ownerOf(resume.id) !== userId) continue;
    const cloudVersion = backedUp.get(resume.id);
    if (cloudVersion !== undefined && cloudVersion >= resume.updatedAt) removed.push(resume.id);
    else kept.push(resume.id);
  }
  releasing = true;
  try {
    for (const id of removed) store.getState().removeResume(id);
  } finally {
    releasing = false;
  }
  ledger.forget(removed);
  return { removed, kept };
}

export function startCloudSync(options: CloudSyncOptions): CloudSync {
  const { userId, api, store, ledger } = options;
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const warn = options.warn ?? defaultWarn;

  const remote = new Map<string, number>();
  const refused = new Map<string, number>();
  // Never uploaded again, whatever happens locally.
  const gone = new Set<string>();
  // While the store changes on the cloud's behalf, so those removals aren't sent back as deletions.
  let applyingCloud = false;
  let loaded = false;
  let loadedAt = 0;
  let stopped = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | null = null;
  let rerun = false;

  ledger.retain(Object.keys(store.getState().resumes));

  const unsubscribe = store.subscribe((state, prev) => {
    if (state.resumes === prev.resumes) return;
    if (userId) {
      const added = Object.keys(state.resumes).filter((id) => !(id in prev.resumes));
      // Claimed right away, so signing out before the first upload can't hand it to someone else.
      if (added.length > 0) ledger.claim(added, userId);
    }
    const removed = Object.keys(prev.resumes).filter((id) => !(id in state.resumes));
    const [only] = removed;
    if (!applyingCloud && !releasing && removed.length === 1 && only) {
      recordDeletion(only);
    } else if (removed.length > 0) {
      // Already deleted in the cloud, or clearAll(): a local reset must never empty the account.
      ledger.forget(removed);
      for (const id of removed) remote.delete(id);
    }
    schedule(debounceMs);
  });

  function fromCloud(change: () => void) {
    applyingCloud = true;
    try {
      change();
    } finally {
      applyingCloud = false;
    }
  }

  function recordDeletion(id: string) {
    const owner = ledger.ownerOf(id);
    const inCloud = remote.delete(id);
    // Signed in, only this account's copies are deleted; signed out, the deletion waits for the
    // owner.
    const cloudOwner = userId
      ? owner === userId || (owner === undefined && inCloud)
        ? userId
        : null
      : (owner ?? null);
    if (cloudOwner) ledger.bury(id, cloudOwner);
    else ledger.forget([id]);
  }

  function schedule(delayMs: number) {
    if (!userId || stopped) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void flush();
    }, delayMs);
  }

  function flush(): Promise<void> {
    if (!userId || stopped) return Promise.resolve();
    clearTimeout(timer);
    timer = undefined;
    if (running) {
      rerun = true;
      return running;
    }
    const user = userId;
    running = (async () => {
      try {
        for (;;) {
          rerun = false;
          const ok = await pass(user);
          if (!ok || !rerun || stopped) break;
        }
      } catch (error) {
        warn("stopped on an unexpected error", error);
      } finally {
        running = null;
      }
    })();
    return running;
  }

  async function pass(user: string): Promise<boolean> {
    if (!loaded && !(await load(user))) return false;
    if (!(await pushDeletions(user))) return false;
    if (!(await pushChanges(user))) return false;
    failures = 0;
    return true;
  }

  async function load(user: string): Promise<boolean> {
    let listed: ResumesResponse;
    try {
      listed = await api.listResumes();
    } catch (error) {
      return failed(error, "couldn't load resumes from the account");
    }
    if (stopped) return false;
    const cloud = listed.resumes;
    // A server from before tombstones (an old deploy during a rollback) sends no deletedIds.
    const deleted = new Set(
      (listed.deletedIds ?? []).filter((id) => {
        // Another account's resume on a shared browser isn't this account's to drop.
        const owner = ledger.ownerOf(id);
        return owner === undefined || owner === user;
      }),
    );
    for (const id of deleted) gone.add(id);
    const buried = new Set(ledger.buried(user));
    const cloudIds = new Set(cloud.map((resume) => resume.id));
    // Already gone from the cloud, so no request is needed.
    for (const id of buried) if (!cloudIds.has(id)) ledger.unbury(id, user);
    // Deleted here while signed out: its cloud copy must not come back before the delete lands.
    const live = cloud.filter((resume) => !buried.has(resume.id) && !deleted.has(resume.id));
    for (const resume of live) remote.set(resume.id, resume.updatedAt);
    const before = store.getState();
    const dropped = Object.keys(before.resumes).filter((id) => deleted.has(id));
    // Newer local copies come back from this too; pushChanges() finds them by updatedAt.
    fromCloud(() => store.getState().mergeFromCloud(live, [...deleted]));
    if (dropped.length > 0) {
      options.onDeletedElsewhere?.({
        ids: dropped,
        wasActive: before.activeId !== null && dropped.includes(before.activeId),
      });
    }
    ledger.assign(
      live.map((resume) => resume.id),
      user,
    );
    ledger.claim(Object.keys(store.getState().resumes), user);
    loaded = true;
    loadedAt = Date.now();
    return true;
  }

  async function pushDeletions(user: string): Promise<boolean> {
    for (const id of ledger.buried(user)) {
      if (stopped) return false;
      try {
        await api.deleteResume(id);
      } catch (error) {
        if (!isApiError(error, "not_found")) {
          return failed(error, "couldn't delete a resume from the account");
        }
      }
      ledger.unbury(id, user);
      remote.delete(id);
    }
    return true;
  }

  async function pushChanges(user: string): Promise<boolean> {
    // A fixed list per pass, so edits during a request wait for the next quiet period.
    const ids = Object.values(store.getState().resumes)
      .filter((resume) => isChanged(resume, user))
      .map((resume) => resume.id);
    for (const id of ids) {
      if (stopped) return false;
      const resume = store.getState().resumes[id];
      if (!resume || !isChanged(resume, user)) continue;
      let saved: PutResumeResponse;
      try {
        saved = await api.putResume(resume);
      } catch (error) {
        if (isApiError(error) && REFUSED.has(error.code)) {
          refused.set(id, resume.updatedAt);
          warn(`the account refused a resume (${error.code})`);
          continue;
        }
        return failed(error, "couldn't back up a resume");
      }
      // Deleted on another device since this session loaded: its deletion wins over local edits.
      if (saved.deleted) dropDeletedElsewhere(id);
      else remote.set(id, resume.updatedAt);
    }
    return true;
  }

  function dropDeletedElsewhere(id: string) {
    gone.add(id);
    remote.delete(id);
    const state = store.getState();
    // Already removed here while the request was out; that deletion is handled as our own.
    if (!state.resumes[id]) return;
    fromCloud(() => state.removeResume(id));
    options.onDeletedElsewhere?.({ ids: [id], wasActive: state.activeId === id });
  }

  function isChanged(resume: Resume, user: string): boolean {
    if (gone.has(resume.id)) return false;
    const owner = ledger.ownerOf(resume.id);
    if (owner !== undefined && owner !== user) return false;
    return (
      remote.get(resume.id) !== resume.updatedAt && refused.get(resume.id) !== resume.updatedAt
    );
  }

  function failed(error: unknown, message: string): false {
    if (isApiError(error, "unauthorized")) {
      stop();
      options.onSessionExpired?.();
      return false;
    }
    warn(message, error);
    failures += 1;
    // The next edit retries sooner through schedule(); this covers a user who stopped editing.
    schedule(Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (failures - 1)));
    return false;
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    timer = undefined;
    unsubscribe();
  }

  function refresh(maxAgeMs: number): Promise<void> {
    if (!userId || stopped) return Promise.resolve();
    if (loaded && Date.now() - loadedAt >= maxAgeMs) loaded = false;
    return flush();
  }

  const firstPass = userId ? flush() : Promise.resolve();

  return { flush, refresh, stop, isStopped: () => stopped, firstPass };
}
