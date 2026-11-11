"use client";

import { useEffect, useSyncExternalStore } from "react";
import { refreshMe, useMe } from "@/components/account/use-me";
import { toast } from "@/components/ui/toast";
import { resetUser } from "@/lib/analytics/client";
import { api } from "@/lib/api/client";
import { browserStorage } from "@/lib/browser-storage";
import { useStudioHydrated, useStudioStore } from "@/lib/store/resume-store";
import { releaseBackedUp, startCloudSync } from "./cloud-sync";
import { createLedger } from "./ledger";
import { createSyncSession } from "./sync-session";

const REREAD_AFTER_MS = 5 * 60_000;

const session = createSyncSession(
  (userId) =>
    startCloudSync({
      userId,
      api,
      store: useStudioStore,
      ledger: createLedger(browserStorage()),
      onSessionExpired: () => void refreshMe(),
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

export function useFirstLoadPending(): boolean {
  const hydrated = useStudioHydrated();
  const { user, loading } = useMe();
  const readDone = useSyncExternalStore(subscribeFirstRead, () => firstReadDone, () => false);
  return !hydrated || loading || (user !== null && !readDone);
}

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
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    window.addEventListener("online", flushNow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", flushNow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimeout(cap);
    };
  }, [hydrated, userId]);
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
    // Trash lives only in this browser, so the next person could restore it.
    useStudioStore.getState().emptyTrash();
    return { kept: kept.length };
  } catch {
    return { kept: 0 };
  }
}
