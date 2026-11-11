"use client";

import { useEffect, useSyncExternalStore } from "react";
import { refreshMe, useMe } from "@/components/account/use-me";
import { toast } from "@/components/ui/toast";
import { resetUser } from "@/lib/analytics/client";
import { api } from "@/lib/api/client";
import { useStudioHydrated, useStudioStore } from "@/lib/store/resume-store";
import { releaseBackedUp, startCloudSync } from "./cloud-sync";
import { createLedger, type LedgerStorage } from "./ledger";
import { createSyncSession } from "./sync-session";

// Signed-out users get no network traffic; their deletions are only noted for a later sign-in.

const REREAD_AFTER_MS = 5 * 60_000;

const session = createSyncSession(
  (userId) =>
    startCloudSync({
      userId,
      api,
      store: useStudioStore,
      ledger: createLedger(browserStorage()),
      onSessionExpired: () => void refreshMe(),
      // Resumes that weren't on screen leave quietly; only the open one vanishing needs a word.
      onDeletedElsewhere: ({ wasActive }) => {
        if (!wasActive) return;
        toast({
          title: "Resume deleted on another device",
          description: "It's been removed here too, so your devices match.",
        });
      },
    }),
  REREAD_AFTER_MS,
);

// The loading screen waits for the first read so other devices' resumes don't pop in later. Capped,
// so a slow server delays the page a few seconds at most.
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

// Only the page's first load counts, not later waits in the tab.
export function useFirstLoadPending(): boolean {
  const hydrated = useStudioHydrated();
  const { user, loading } = useMe();
  const readDone = useSyncExternalStore(subscribeFirstRead, () => firstReadDone, () => false);
  return !hydrated || loading || (user !== null && !readDone);
}

// `signedInAs` lets the first read start beside /api/me instead of waiting for it.
export function useCloudSync(signedInAs?: string): void {
  const hydrated = useStudioHydrated();
  const { user, loading } = useMe();
  const userId = user?.id ?? (loading ? (signedInAs ?? null) : null);

  useEffect(() => {
    // Merging before localStorage has loaded would treat the user's resumes as missing.
    if (!hydrated) return;
    const sync = session.acquire(userId);
    let cap: ReturnType<typeof setTimeout> | undefined;
    if (userId && !firstReadDone) {
      cap = setTimeout(finishFirstRead, FIRST_READ_MAX_MS);
      void sync.firstPass.finally(() => {
        clearTimeout(cap);
        finishFirstRead();
      });
    }

    const flushNow = () => void sync.flush();
    // The tab may be about to close; a request started now usually still completes.
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    window.addEventListener("online", flushNow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    // The session stays up: the next shell (dashboard or studio) picks it up without a new read.
    return () => {
      window.removeEventListener("online", flushNow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimeout(cap);
    };
  }, [hydrated, userId]);
}

// Bounded, so a slow server can't hold up the action the user asked for.
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

// So the next person on a shared computer can't open them. Resolves with how many stayed because
// they hadn't finished backing up. Throws, changing nothing, when sign-out fails.
export async function signOutAndRelease(userId: string): Promise<{ kept: number }> {
  await flushCloudSync();
  // Read while the session still works. Without it nothing can be shown to be backed up, so
  // everything stays.
  const cloud = await api.listResumes().then(
    (listed) => listed.resumes,
    () => [],
  );
  await api.logout();
  resetUser();
  try {
    if (!useStudioStore.persist.hasHydrated()) await useStudioStore.persist.rehydrate();
    session.end();
    const ledger = createLedger(browserStorage());
    const { kept } = releaseBackedUp({ userId, store: useStudioStore, ledger, cloud });
    // The trash stays only in this browser, so the next person could restore it: sign-out empties
    // it.
    useStudioStore.getState().emptyTrash();
    return { kept: kept.length };
  } catch {
    // Storage is blocked, so there was nothing saved here to remove.
    return { kept: 0 };
  }
}

function browserStorage(): LedgerStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
