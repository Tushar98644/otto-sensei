"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSessionUserId } from "@/components/account/session-user";
import { useMe } from "@/components/account/use-me";
import { api } from "@/lib/api/client";
import { readJsonItem, writeJsonItem } from "@/lib/browser-storage";
import type { WeakLineTarget } from "@/lib/setup/checklist";
import {
  NO_SETUP,
  type AccountSetup,
  type SetupDefaults,
  type SetupDefaultsResponse,
  type SetupGuess,
} from "@/lib/setup/types";

type Load = "idle" | "loading" | "ready" | "error";

type Local = { checklistHiddenAt: number | null; weakLine: WeakLineTarget | null };

const NO_LOCAL: Local = { checklistHiddenAt: null, weakLine: null };

type Snapshot = {
  userId: string | null;
  status: Load;
  remote: AccountSetup;
  local: Local;
};

const IDLE: Snapshot = {
  userId: null,
  status: "idle",
  remote: NO_SETUP,
  local: NO_LOCAL,
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

const time = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

function readLocal(userId: string): Local {
  const value = readJsonItem(keyOf(userId)) as Record<string, unknown> | null;
  if (value === null) return NO_LOCAL;
  const line = value.weakLine as Record<string, unknown> | null | undefined;
  return {
    checklistHiddenAt: time(value.checklistHiddenAt),
    weakLine:
      line && typeof line.resumeId === "string" && typeof line.bulletId === "string"
        ? { resumeId: line.resumeId, bulletId: line.bulletId }
        : null,
  };
}

function writeLocal(userId: string, patch: Partial<Local>) {
  if (snapshot.userId !== userId) return;
  const local = { ...snapshot.local, ...patch };
  setSnapshot({ ...snapshot, local });
  writeJsonItem(keyOf(userId), local);
}

function load(userId: string): Promise<void> {
  if (inflight?.userId === userId) return inflight.promise;
  const keep = snapshot.userId === userId;
  setSnapshot({
    userId,
    status: "loading",
    remote: keep ? snapshot.remote : NO_SETUP,
    local: keep ? snapshot.local : readLocal(userId),
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
      checklistHiddenAt: number | null;
      weakLine: WeakLineTarget | null;
      defaultsAt: number | null;
      lookingForAt: number | null;
      guess: SetupGuess | null;
    };

export function useAccountSetup(): AccountSetupState {
  const { loading } = useMe();
  const userId = useSessionUserId();
  const current = useSyncExternalStore(subscribe, () => snapshot, () => IDLE);

  useEffect(() => {
    if (userId && (snapshot.userId !== userId || snapshot.status === "idle")) void load(userId);
  }, [userId]);

  if (!userId) return loading ? { status: "unknown" } : { status: "signed_out" };
  if (current.userId !== userId || current.status === "idle") {
    return {
      status: "loading",
      userId,
      checklistHiddenAt: null,
      weakLine: null,
      defaultsAt: null,
      lookingForAt: null,
      guess: null,
    };
  }
  const { remote, local } = current;
  return {
    status: current.status,
    userId,
    checklistHiddenAt: remote.checklistHiddenAt ?? local.checklistHiddenAt,
    weakLine: local.weakLine,
    defaultsAt: remote.defaultsAt,
    lookingForAt: remote.lookingForAt,
    guess: remote.guess,
  };
}

export function useSetupGuess(): SetupGuess | null {
  const setup = useAccountSetup();
  return "guess" in setup ? setup.guess : null;
}

async function save(userId: string, change: Parameters<typeof api.saveAccountSetup>[0]) {
  try {
    const res = await api.saveAccountSetup(change);
    if (snapshot.userId === userId) setSnapshot({ ...snapshot, remote: res.setup });
  } catch {}
}

export function setChecklistHidden(userId: string, hidden: boolean): Promise<void> {
  const at = hidden ? Date.now() : null;
  if (snapshot.userId === userId) {
    setSnapshot({ ...snapshot, remote: { ...snapshot.remote, checklistHiddenAt: at } });
  }
  writeLocal(userId, { checklistHiddenAt: at });
  return save(userId, { checklist: hidden ? "hidden" : "shown" });
}

export function confirmSetupGuess(userId: string): Promise<void> {
  if (snapshot.userId !== userId || snapshot.remote.guess === null) return Promise.resolve();
  setSnapshot({ ...snapshot, remote: { ...snapshot.remote, guess: null } });
  return save(userId, { guess: "confirmed" });
}

export async function sendSetupDefaults(
  userId: string,
  body: SetupDefaults,
): Promise<SetupDefaultsResponse> {
  const res = await api.saveSetupDefaults(body);
  if (snapshot.userId === userId) setSnapshot({ ...snapshot, remote: res.setup });
  return res;
}

export function rememberWeakLine(userId: string, target: WeakLineTarget): void {
  writeLocal(userId, { weakLine: target });
}
