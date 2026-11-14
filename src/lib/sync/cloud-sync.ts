import { isApiError, type ApiClientError } from "@/lib/api/client";
import type { EmptyOk } from "@/lib/api/types";
import type { Resume } from "@/lib/resume/schema";
import { isApplyingAnotherTab } from "@/lib/store/studio-storage";
import {
  MAX_KNOWN_RESUMES,
  type KnownResumes,
  type PutResumeOptions,
  type PutResumeResult,
  type ResumeList,
} from "./api-types";
import type { SyncLedger } from "./ledger";

export type SyncApi = {
  listResumes: (known?: KnownResumes) => Promise<ResumeList>;
  putResume: (resume: Resume, options?: PutResumeOptions) => Promise<PutResumeResult>;
  deleteResume: (id: string) => Promise<EmptyOk>;
};

export type SyncStoreState = {
  resumes: Record<string, Resume>;
  activeId: string | null;
  mergeFromCloud: (
    cloud: Resume[],
    deletedIds?: readonly string[],
    conflicted?: ReadonlySet<string>,
  ) => Resume[];
  removeResume: (id: string) => void;
};

export type DeletedElsewhere = {
  ids: string[];
  wasActive: boolean;
};

export type SyncStore = {
  getState: () => SyncStoreState;
  subscribe: (listener: (state: SyncStoreState, prev: SyncStoreState) => void) => () => void;
};

export type CloudSyncOptions = {
  userId: string | null;
  api: SyncApi;
  store: SyncStore;
  ledger: SyncLedger;
  debounceMs?: number;
  maxWaitMs?: number;
  onSessionExpired?: () => void;
  onDeletedElsewhere?: (detail: DeletedElsewhere) => void;
  onConflict?: (ids: string[]) => void;
  warn?: (message: string, error?: unknown) => void;
};

export type CloudSync = {
  flush: () => Promise<void>;
  refresh: (maxAgeMs: number) => Promise<void>;
  // The page is hiding or closing: sends every unsaved edit at once, outliving the page.
  leave: () => void;
  retryRefused: () => void;
  stop: () => void;
  isStopped: () => boolean;
  // Settles once the account has been read (or that failed): what's shown no longer changes.
  firstLoad: Promise<void>;
};

let releasing = false;

const DEFAULT_DEBOUNCE_MS = 5_000;
const DEFAULT_MAX_WAIT_MS = 30_000;
const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 60_000;
// keepalive requests share 64 KiB in flight per page, beacons included.
const KEEPALIVE_BUDGET_BYTES = 60_000;
// The longest resume id the routes accept.
const MAX_ID_LENGTH = 64;

// No room on the plan or under the cap: asked again only once room may have opened.
const NO_ROOM: ReadonlySet<ApiClientError["code"]> = new Set<ApiClientError["code"]>([
  "limit_reached",
  "upgrade_required",
]);

// This version can't be saved; a later edit may fix that.
const REFUSED: ReadonlySet<ApiClientError["code"]> = new Set<ApiClientError["code"]>([
  "bad_request",
  "too_large",
  "unsupported_type",
]);

function defaultWarn(message: string, error?: unknown) {
  console.warn(`[cloud-sync] ${message}`, error ?? "");
}

function byteLength(resume: Resume): number {
  return new TextEncoder().encode(JSON.stringify(resume)).byteLength;
}

// The route turns away the whole list over one odd entry, so a copy it couldn't take is left out.
function isKnowable({ id, updatedAt }: Resume): boolean {
  return (
    id.length > 0 && id.length <= MAX_ID_LENGTH && Number.isSafeInteger(updatedAt) && updatedAt >= 0
  );
}

// What the browser holds of the account's resumes, as POST /api/resumes takes it; too many sends none.
export function knownVersions(
  resumes: readonly Resume[],
  keep: (id: string) => boolean,
): KnownResumes {
  const known: Record<string, number> = {};
  let count = 0;
  for (const resume of resumes) {
    if (!keep(resume.id) || !isKnowable(resume)) continue;
    if (++count > MAX_KNOWN_RESUMES) return {};
    known[resume.id] = resume.updatedAt;
  }
  return known;
}

// The account's version of each listed resume; `unchanged` ones hold the version that was sent.
export function cloudVersions(listed: ResumeList, known: KnownResumes): Map<string, number> {
  const versions = new Map(listed.resumes.map((resume) => [resume.id, resume.updatedAt]));
  for (const id of listed.unchanged ?? []) {
    const at = known[id];
    if (at !== undefined) versions.set(id, at);
  }
  return versions;
}

export type ReleaseOptions = {
  userId: string;
  store: SyncStore;
  ledger: SyncLedger;
  cloud: ReadonlyMap<string, number>;
};

// On sign-out, so the next person on a shared computer can't open them; not deletions.
export function releaseBackedUp({ userId, store, ledger, cloud }: ReleaseOptions): {
  removed: string[];
  kept: string[];
} {
  const removed: string[] = [];
  const kept: string[] = [];
  for (const resume of Object.values(store.getState().resumes)) {
    if (ledger.ownerOf(resume.id) !== userId) continue;
    const cloudVersion = cloud.get(resume.id);
    // A newer copy in the account only counts when this one has no edits of its own.
    const backedUp =
      cloudVersion === resume.updatedAt ||
      (cloudVersion !== undefined &&
        cloudVersion > resume.updatedAt &&
        ledger.syncedAt(resume.id) === resume.updatedAt);
    if (backedUp) removed.push(resume.id);
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
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const warn = options.warn ?? defaultWarn;

  const remote = new Map<string, number>();
  const refused = new Map<string, number>();
  const noRoom = new Set<string>();
  const sending = new Map<string, { at: number; keepalive: boolean }>();
  // Copies sent whose answer never came: the account holding one is this browser's doing.
  const unanswered = new Map<string, Set<number>>();
  const gone = new Set<string>();
  // While the store changes on the cloud's behalf, so those removals aren't sent back as deletions.
  let applyingCloud = false;
  let loaded = false;
  let loadedAt = 0;
  let stopped = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let editDueBy: number | undefined;
  let running: Promise<void> | null = null;
  let rerun = false;
  let settleFirstLoad = () => {};
  const firstLoad = userId
    ? new Promise<void>((resolve) => {
        settleFirstLoad = resolve;
      })
    : Promise.resolve();

  ledger.retain(Object.keys(store.getState().resumes));

  const unsubscribe = store.subscribe((state, prev) => {
    if (state.resumes === prev.resumes) return;
    const elsewhere = isApplyingAnotherTab();
    if (userId) {
      const added = Object.keys(state.resumes).filter((id) => !(id in prev.resumes));
      // Claimed right away, so signing out before the first upload can't hand it to someone else.
      if (added.length > 0) ledger.claim(added, userId);
    }
    const removed = Object.keys(prev.resumes).filter((id) => !(id in state.resumes));
    const [only] = removed;
    if (!applyingCloud && !releasing && !elsewhere && removed.length === 1 && only) {
      recordDeletion(only);
    } else if (removed.length > 0) {
      // Deleted in the cloud, clearAll(), or another tab's doing: never a deletion to send.
      ledger.forget(removed);
      for (const id of removed) remote.delete(id);
    }
    // Another tab uploads its own edits.
    if (!elsewhere) scheduleEdit();
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

  // A quiet pause after typing, but never longer than maxWaitMs behind the first unsent edit.
  function scheduleEdit() {
    if (!userId || stopped) return;
    const now = Date.now();
    editDueBy ??= now + maxWaitMs;
    schedule(Math.max(0, Math.min(debounceMs, editDueBy - now)));
  }

  function flush(): Promise<void> {
    if (!userId || stopped) return Promise.resolve();
    clearTimeout(timer);
    timer = undefined;
    editDueBy = undefined;
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
    ledger.refresh();
    if (!loaded && !(await load(user))) return false;
    if (!(await pushDeletions(user))) return false;
    if (!(await pushChanges(user))) return false;
    failures = 0;
    // A save came back stale: read the account again before trying that resume once more.
    if (!loaded) schedule(RETRY_BASE_MS);
    return true;
  }

  async function load(user: string): Promise<boolean> {
    const known = knownVersions(Object.values(store.getState().resumes), (id) => {
      const owner = ledger.ownerOf(id);
      return owner === undefined || owner === user;
    });
    let listed: ResumeList;
    try {
      listed = await api.listResumes(known);
    } catch (error) {
      settleFirstLoad();
      return failed(error, "couldn't load resumes from the account");
    }
    if (stopped) return false;
    const deleted = new Set(
      (listed.deletedIds ?? []).filter((id) => {
        // Another account's resume on a shared browser isn't this account's to drop.
        const owner = ledger.ownerOf(id);
        return owner === undefined || owner === user;
      }),
    );
    for (const id of deleted) gone.add(id);
    const buried = new Set(ledger.buried(user));
    const versions = cloudVersions(listed, known);
    for (const id of buried) if (!versions.has(id)) ledger.unbury(id, user);
    // Deleted here while signed out: its cloud copy must not come back before the delete lands.
    const isLive = (id: string) => !buried.has(id) && !deleted.has(id);
    const live = listed.resumes.filter((resume) => isLive(resume.id));
    const liveIds = [...versions.keys()].filter(isLive);
    for (const id of liveIds) remote.set(id, versions.get(id)!);
    const before = store.getState();
    const isOurs = (id: string) => unanswered.get(id)?.has(versions.get(id)!) === true;
    const conflicted = new Set(
      live
        .filter((resume) => {
          const here = before.resumes[resume.id];
          const base = ledger.syncedAt(resume.id);
          // Both changed since they last matched; with no record of that, the newer one wins.
          return (
            here !== undefined &&
            base !== undefined &&
            here.updatedAt !== resume.updatedAt &&
            here.updatedAt !== base &&
            resume.updatedAt !== base &&
            !isOurs(resume.id)
          );
        })
        .map((resume) => resume.id),
    );
    const dropped = Object.keys(before.resumes).filter((id) => deleted.has(id));
    fromCloud(() => store.getState().mergeFromCloud(live, [...deleted], conflicted));
    if (dropped.length > 0) {
      options.onDeletedElsewhere?.({
        ids: dropped,
        wasActive: before.activeId !== null && dropped.includes(before.activeId),
      });
    }
    if (conflicted.size > 0) options.onConflict?.([...conflicted]);
    ledger.assign(liveIds, user);
    ledger.claim(Object.keys(store.getState().resumes), user);
    const after = store.getState().resumes;
    // A settled conflict counts as matched, so the next read doesn't keep another copy again.
    ledger.markSynced(
      liveIds
        .filter(
          (id) => conflicted.has(id) || isOurs(id) || after[id]?.updatedAt === versions.get(id),
        )
        .map((id) => [id, versions.get(id)!] as const),
    );
    noRoom.clear();
    loaded = true;
    loadedAt = Date.now();
    settleFirstLoad();
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
      // A slot may have opened for a resume the plan or the cap turned away.
      noRoom.clear();
    }
    return true;
  }

  // Settled before the request counts as done, so nothing sends the same copy in between.
  function send(resume: Resume, keepalive: boolean): Promise<void> {
    const base: PutResumeOptions = { base: remote.get(resume.id) };
    const flight = { at: resume.updatedAt, keepalive };
    sending.set(resume.id, flight);
    const ours = unanswered.get(resume.id) ?? new Set<number>();
    unanswered.set(resume.id, ours.add(resume.updatedAt));
    const sent = keepalive
      ? api
          .putResume(resume, { ...base, keepalive: true })
          // Over the page's keepalive allowance: an ordinary request may still make it.
          .catch((error: unknown) =>
            isApiError(error, "network_error")
              ? api.putResume(resume, base)
              : Promise.reject(error),
          )
      : api.putResume(resume, base);
    return sent
      .then((saved) => settle(resume, saved))
      .finally(() => {
        if (sending.get(resume.id) === flight) sending.delete(resume.id);
      });
  }

  function settle(resume: Resume, saved: PutResumeResult) {
    if (stopped) return;
    if (!saved.stale) unanswered.delete(resume.id);
    if (saved.deleted) dropDeletedElsewhere(resume.id);
    else if (saved.stale) loaded = false;
    else {
      remote.set(resume.id, resume.updatedAt);
      ledger.markSynced([[resume.id, resume.updatedAt]]);
    }
  }

  function refuse(resume: Resume, error: unknown): boolean {
    if (!isApiError(error)) return false;
    if (NO_ROOM.has(error.code)) noRoom.add(resume.id);
    else if (REFUSED.has(error.code)) refused.set(resume.id, resume.updatedAt);
    else return false;
    warn(`the account refused a resume (${error.code})`);
    return true;
  }

  async function pushChanges(user: string): Promise<boolean> {
    const ids = Object.values(store.getState().resumes)
      .filter((resume) => isChanged(resume, user))
      .map((resume) => resume.id);
    for (const id of ids) {
      if (stopped) return false;
      const resume = store.getState().resumes[id];
      if (!resume || !isChanged(resume, user)) continue;
      try {
        await send(resume, false);
      } catch (error) {
        if (refuse(resume, error)) continue;
        return failed(error, "couldn't back up a resume");
      }
    }
    return true;
  }

  function leave() {
    if (!userId || stopped) return;
    // Before the account's first read nothing tells which copies are new, so the pass sends them.
    if (loadedAt > 0) {
      ledger.refresh();
      let budget = KEEPALIVE_BUDGET_BYTES;
      for (const resume of Object.values(store.getState().resumes)) {
        if (!isChanged(resume, userId, true)) continue;
        const bytes = byteLength(resume);
        const keepalive = bytes <= budget;
        if (keepalive) budget -= bytes;
        void send(resume, keepalive).catch((error: unknown) => void refuse(resume, error));
      }
    }
    void flush();
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

  // Leaving, a request already out without keepalive is sent again: closing the page cancels it.
  function isChanged(resume: Resume, user: string, leaving = false): boolean {
    const { id, updatedAt } = resume;
    if (gone.has(id) || noRoom.has(id)) return false;
    const owner = ledger.ownerOf(id);
    if (owner !== undefined && owner !== user) return false;
    if (remote.get(id) === updatedAt || refused.get(id) === updatedAt) return false;
    const flight = sending.get(id);
    if (flight?.at === updatedAt && (flight.keepalive || !leaving)) return false;
    // Another tab already backed up this exact copy.
    if (ledger.syncedAt(id) === updatedAt) {
      remote.set(id, updatedAt);
      return false;
    }
    return true;
  }

  function failed(error: unknown, message: string): false {
    if (isApiError(error, "unauthorized")) {
      stop();
      options.onSessionExpired?.();
      return false;
    }
    warn(message, error);
    failures += 1;
    schedule(Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (failures - 1)));
    return false;
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    timer = undefined;
    unsubscribe();
    settleFirstLoad();
  }

  function refresh(maxAgeMs: number): Promise<void> {
    if (!userId || stopped) return Promise.resolve();
    if (loaded && Date.now() - loadedAt >= maxAgeMs) loaded = false;
    return flush();
  }

  function retryRefused() {
    if (noRoom.size === 0) return;
    noRoom.clear();
    void flush();
  }

  if (userId) void flush();

  return { flush, refresh, leave, retryRefused, stop, isStopped: () => stopped, firstLoad };
}
