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

// Backs up the studio to the signed-in account. Mounted by the studio and dashboard shells, which
// share one session per account (sync-session.ts). Signed-out users get no network traffic at all;
// their deletions are only noted for a later sign-in.

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

// The first read of the account's resumes in this tab. The dashboard and studio keep the loading
// screen up until it's in, so resumes from other devices don't pop in after the page shows.
// Capped, so a slow server delays the page by a few seconds at most, never holds it.
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

/**
 * True on a page's first load until this browser's copy has loaded and, when signed in, the
 * account's resumes have been read once. Later waits in the tab don't count.
 */
export function useFirstLoadPending(): boolean {
  const hydrated = useStudioHydrated();
  const { user, loading } = useMe();
  const readDone = useSyncExternalStore(subscribeFirstRead, () => firstReadDone, () => false);
  return !hydrated || loading || (user !== null && !readDone);
}

/**
 * `signedInAs`: the account the server already checked for this page (the dashboard layout), so
 * the first read of its resumes starts beside /api/me instead of waiting for it.
 */
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

// Pushes pending changes before something ends the session, such as signing out. Bounded, so a
// slow server can't hold up the action the user asked for.
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

/**
 * Signs out, then takes the account's backed-up resumes out of this browser (releaseBackedUp), so
 * the next person on a shared computer can't open them. Works on any page, not just the studio.
 * Resolves with how many of the account's resumes stayed because they hadn't finished backing up.
 * Throws, changing nothing, when the sign-out request fails.
 */
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
    // The session it syncs for is over.
    session.end();
    const ledger = createLedger(browserStorage());
    const { kept } = releaseBackedUp({ userId, store: useStudioStore, ledger, cloud });
    // Deleted resumes stay only in this browser, so on a shared computer the next person could
    // restore them. Signing out empties the trash.
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
