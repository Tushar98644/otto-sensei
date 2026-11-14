"use client";

import { useEffect, useSyncExternalStore } from "react";
import { refreshMe, signedInUserId, useMe } from "@/components/account/use-me";
import { toast } from "@/components/ui/toast";
import { resetUser } from "@/lib/analytics/client";
import { api } from "@/lib/api/client";
import { browserStorage } from "@/lib/browser-storage";
import { flushStudio, useStudioHydrated, useStudioStore } from "@/lib/store/resume-store";
import type { KnownResumes, ResumeList } from "./api-types";
import {
  cloudVersions,
  knownVersions,
  releaseBackedUp,
  startCloudSync,
  type SyncApi,
} from "./cloud-sync";
import { createLedger } from "./ledger";
import { createSyncSession } from "./sync-session";

const REREAD_AFTER_MS = 5 * 60_000;
// Coming back to a tab re-reads the account first, so an old tab can't overwrite newer edits.
const REREAD_ON_RETURN_MS = 30_000;
const RESTART_GAP_MS = 5 * 60_000;

let early: { known: KnownResumes; listed: Promise<ResumeList> } | null = null;

function sameKnown(a: KnownResumes, b: KnownResumes): boolean {
  const ids = Object.keys(a);
  return ids.length === Object.keys(b).length && ids.every((id) => a[id] === b[id]);
}

function knownOf(keep: (owner: string | undefined) => boolean): KnownResumes {
  const ledger = createLedger(browserStorage());
  return knownVersions(Object.values(useStudioStore.getState().resumes), (id) =>
    keep(ledger.ownerOf(id)),
  );
}

// /studio learns who is signed in from /api/me, so the account's list is asked for alongside it.
export function listEarly(): void {
  if (early) return;
  const ledger = createLedger(browserStorage());
  const owners = new Set(
    Object.keys(useStudioStore.getState().resumes).map((id) => ledger.ownerOf(id)),
  );
  owners.delete(undefined);
  // None: most likely signed out. Several: which one is signed in is anyone's guess.
  const [owner] = owners;
  if (owners.size !== 1 || owner === undefined) return;
  // Picked as the account's first read will, so its answer can be used for it.
  const known = knownOf((of) => of === undefined || of === owner);
  const listed = api.listResumes(known);
  listed.catch(() => {});
  early = { known, listed };
}

const syncApi: SyncApi = {
  listResumes: (known) => {
    const taken = early;
    early = null;
    if (taken && known && sameKnown(taken.known, known)) {
      return taken.listed.catch(() => api.listResumes(known));
    }
    return api.listResumes(known);
  },
  putResume: (resume, options) => api.putResume(resume, options),
  deleteResume: (id) => api.deleteResume(id),
};

let restartedAt = 0;

// A 401 while /api/me still has the same user (signed out and back in elsewhere): back up again.
function restartAfterExpiry(userId: string | null) {
  void refreshMe().then(() => {
    if (!userId || signedInUserId() !== userId) return;
    if (Date.now() - restartedAt < RESTART_GAP_MS) return;
    restartedAt = Date.now();
    session.acquire(userId);
  });
}

const session = createSyncSession(
  (userId) =>
    startCloudSync({
      userId,
      api: syncApi,
      store: useStudioStore,
      ledger: createLedger(browserStorage()),
      onSessionExpired: () => restartAfterExpiry(userId),
      onDeletedElsewhere: ({ wasActive }) => {
        if (!wasActive) return;
        toast({
          title: "Resume deleted on another device",
          description: "It's been removed here too, so your devices match.",
        });
      },
      onConflict: () =>
        toast({
          title: "Resume changed on two devices",
          description: "We kept both. The other copy is in its saved versions.",
        }),
    }),
  REREAD_AFTER_MS,
);

const FIRST_READ_MAX_MS = 6_000;
let firstReadDone = false;
const firstReadListeners = new Set<() => void>();

function finishFirstRead() {
  if (firstReadDone) return;
  firstReadDone = true;
  for (const listener of firstReadListeners) listener();
}

function subscribeFirstRead(listener: () => void) {
  firstReadListeners.add(listener);
  return () => {
    firstReadListeners.delete(listener);
  };
}

// serverUserId: a user the server already checked, so /api/me isn't waited for.
export function useFirstLoadPending(serverUserId?: string | null): boolean {
  const hydrated = useStudioHydrated();
  const { user, loading } = useMe();
  const readDone = useSyncExternalStore(
    subscribeFirstRead,
    () => firstReadDone,
    () => false,
  );
  const signedIn = user !== null || (loading && Boolean(serverUserId));
  return !hydrated || (loading && !serverUserId) || (signedIn && !readDone);
}

export function useCloudSync(signedInAs?: string): void {
  const hydrated = useStudioHydrated();
  const { user, loading } = useMe();
  const userId = user?.id ?? (loading ? (signedInAs ?? null) : null);
  const plan = user?.plan ?? null;

  useEffect(() => {
    if (!hydrated) return;
    if (loading && !signedInAs) listEarly();
    else if (!loading && !user) early = null;
  }, [hydrated, loading, signedInAs, user]);

  useEffect(() => {
    // Merging before localStorage has loaded would treat the user's resumes as missing.
    if (!hydrated) return;
    const sync = session.acquire(userId);
    let cap: ReturnType<typeof setTimeout> | undefined;
    if (userId && !firstReadDone) {
      cap = setTimeout(finishFirstRead, FIRST_READ_MAX_MS);
      void sync.firstLoad.finally(() => {
        clearTimeout(cap);
        finishFirstRead();
      });
    }

    // The session can restart after a 401, so these always reach the current one.
    const onOnline = () => void session.current()?.flush();
    const onPageHide = () => session.current()?.leave();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") session.current()?.leave();
      else void session.current()?.refresh(REREAD_ON_RETURN_MS);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimeout(cap);
    };
  }, [hydrated, userId]);

  // An upgrade gives refused resumes another try without a reload.
  useEffect(() => {
    if (plan) session.current()?.retryRefused();
  }, [plan]);
}

export function flushCloudSync(timeoutMs = 3_000): Promise<void> {
  const sync = session.current();
  if (!sync) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    void sync.flush().finally(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export async function signOutAndRelease(userId: string): Promise<{ kept: number }> {
  await flushCloudSync();
  const known = knownOf((owner) => owner === userId);
  const cloud = await api.listResumes(known).then(
    (listed) => cloudVersions(listed, known),
    () => new Map<string, number>(),
  );
  await api.logout();
  resetUser();
  try {
    if (!useStudioStore.persist.hasHydrated()) await useStudioStore.persist.rehydrate();
    session.end();
    const ledger = createLedger(browserStorage());
    const { kept } = releaseBackedUp({ userId, store: useStudioStore, ledger, cloud });
    // Trash lives only in this browser, so the next person could restore it.
    useStudioStore.getState().emptyTrash();
    // Saved now, not after the usual pause, so the next person here finds them gone.
    flushStudio();
    return { kept: kept.length };
  } catch {
    return { kept: 0 };
  }
}
