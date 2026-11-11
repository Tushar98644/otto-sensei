"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMe } from "@/components/account/use-me";
import { api } from "@/lib/api/client";
import type { WeakLineTarget } from "@/lib/setup/checklist";
import { NO_SETUP, type AccountSetup, type SetupStepOutcome } from "@/lib/setup/types";

// One shared GET /api/setup per signed-in account, like the work profile. This browser keeps its
// own note of what was answered too, so a server that can't be reached (or one that hasn't run
// the migration yet) never brings the step or a hidden list back on every visit. The line the
// "Fix the first weak line" item opened is only kept here: it is a hint, not account data.

type Load = "idle" | "loading" | "ready" | "error";

type Local = { stepAt: number | null; checklistHiddenAt: number | null; weakLine: WeakLineTarget | null };

const NO_LOCAL: Local = { stepAt: null, checklistHiddenAt: null, weakLine: null };

type Snapshot = {
  userId: string | null;
  status: Load;
  remote: AccountSetup;
  local: Local;
  // The step opened during this page load, so the dashboard tour waits for the next visit.
  shownThisLoad: boolean;
};

const IDLE: Snapshot = {
  userId: null,
  status: "idle",
  remote: NO_SETUP,
  local: NO_LOCAL,
  shownThisLoad: false,
};

let snapshot: Snapshot = IDLE;
let inflight: { userId: string; promise: Promise<void> } | null = null;
const listeners = new Set<() => void>();

function setSnapshot(next: Snapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const keyOf = (userId: string) => `otto.setup.${userId}`;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

const time = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

function readLocal(userId: string): Local {
  try {
    const raw = storage()?.getItem(keyOf(userId));
    if (!raw) return NO_LOCAL;
    const value = JSON.parse(raw) as Record<string, unknown>;
    const line = value.weakLine as Record<string, unknown> | null | undefined;
    return {
      stepAt: time(value.stepAt),
      checklistHiddenAt: time(value.checklistHiddenAt),
      weakLine:
        line && typeof line.resumeId === "string" && typeof line.bulletId === "string"
          ? { resumeId: line.resumeId, bulletId: line.bulletId }
          : null,
    };
  } catch {
    return NO_LOCAL;
  }
}

function writeLocal(userId: string, patch: Partial<Local>) {
  if (snapshot.userId !== userId) return;
  const local = { ...snapshot.local, ...patch };
  setSnapshot({ ...snapshot, local });
  try {
    storage()?.setItem(keyOf(userId), JSON.stringify(local));
  } catch {
    // Full or blocked storage: the server copy is the one that counts anyway.
  }
}

function load(userId: string): Promise<void> {
  if (inflight?.userId === userId) return inflight.promise;
  const keep = snapshot.userId === userId;
  setSnapshot({
    userId,
    status: "loading",
    remote: keep ? snapshot.remote : NO_SETUP,
    local: keep ? snapshot.local : readLocal(userId),
    shownThisLoad: keep ? snapshot.shownThisLoad : false,
  });
  const promise = api
    .accountSetup()
    .then((res) => {
      if (snapshot.userId === userId) setSnapshot({ ...snapshot, status: "ready", remote: res.setup });
    })
    .catch(() => {
      if (snapshot.userId === userId) setSnapshot({ ...snapshot, status: "error" });
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { userId, promise };
  return promise;
}

export type AccountSetupState =
  | { status: "unknown" }
  | { status: "signed_out" }
  | {
      status: "loading" | "ready" | "error";
      userId: string;
      // What the server said, or this browser's note where it couldn't.
      stepAt: number | null;
      checklistHiddenAt: number | null;
      weakLine: WeakLineTarget | null;
      localStepAt: number | null;
      shownThisLoad: boolean;
    };

export function useAccountSetup(): AccountSetupState {
  const { user, loading } = useMe();
  const current = useSyncExternalStore(subscribe, () => snapshot, () => IDLE);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (userId && (snapshot.userId !== userId || snapshot.status === "idle")) void load(userId);
  }, [userId]);

  if (loading) return { status: "unknown" };
  if (!userId) return { status: "signed_out" };
  if (current.userId !== userId || current.status === "idle") {
    return {
      status: "loading",
      userId,
      stepAt: null,
      checklistHiddenAt: null,
      weakLine: null,
      localStepAt: null,
      shownThisLoad: false,
    };
  }
  const { remote, local } = current;
  return {
    status: current.status,
    userId,
    stepAt: remote.stepAt ?? local.stepAt,
    // Hidden on either side stays hidden: a "Hide this" that never reached the server still holds
    // in this browser.
    checklistHiddenAt: remote.checklistHiddenAt ?? local.checklistHiddenAt,
    weakLine: local.weakLine,
    localStepAt: local.stepAt,
    shownThisLoad: current.shownThisLoad,
  };
}

async function save(userId: string, change: Parameters<typeof api.saveAccountSetup>[0]) {
  try {
    const res = await api.saveAccountSetup(change);
    if (snapshot.userId === userId) setSnapshot({ ...snapshot, remote: res.setup });
  } catch {
    // This browser's note already holds it; the server gets it next time something is saved.
  }
}

/** Save, Skip or a close of the first-login step: it never opens again for this account. */
export function recordSetupStep(userId: string, outcome: SetupStepOutcome): Promise<void> {
  const now = Date.now();
  if (snapshot.userId === userId) {
    setSnapshot({ ...snapshot, remote: { ...snapshot.remote, stepAt: now, stepOutcome: outcome } });
  }
  writeLocal(userId, { stepAt: now });
  return save(userId, { step: outcome });
}

/** "Hide this" on the Home list, and its Undo. */
export function setChecklistHidden(userId: string, hidden: boolean): Promise<void> {
  const at = hidden ? Date.now() : null;
  if (snapshot.userId === userId) {
    setSnapshot({ ...snapshot, remote: { ...snapshot.remote, checklistHiddenAt: at } });
  }
  writeLocal(userId, { checklistHiddenAt: at });
  return save(userId, { checklist: hidden ? "hidden" : "shown" });
}

/** The line "Fix the first weak line" opened, so the item ticks once that line reads well. */
export function rememberWeakLine(userId: string, target: WeakLineTarget): void {
  writeLocal(userId, { weakLine: target });
}

export function markSetupStepShown(): void {
  if (!snapshot.shownThisLoad) setSnapshot({ ...snapshot, shownThisLoad: true });
}
