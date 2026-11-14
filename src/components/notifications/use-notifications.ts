"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSessionUserId } from "@/components/account/session-user";
import { api } from "@/lib/api/client";
import type { Notification } from "@/lib/notifications/types";

// Kept per user id, so another sign-in never shows the last person's list.

type State = {
  userId: string | null;
  status: "idle" | "loading" | "ready" | "error";
  items: Notification[];
  unread: number;
  loadedAt: number;
  fresh: ReadonlySet<string>;
};

const NONE: ReadonlySet<string> = new Set();
const IDLE: State = { userId: null, status: "idle", items: [], unread: 0, loadedAt: 0, fresh: NONE };
const STALE_AFTER_MS = 5 * 60 * 1_000;

let state: State = IDLE;
let inflight: { userId: string; promise: Promise<void> } | null = null;
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function loadNotifications(userId: string): Promise<void> {
  if (inflight?.userId === userId) return inflight.promise;
  const keep = state.userId === userId;
  setState(
    keep
      ? { ...state, status: state.status === "ready" ? "ready" : "loading" }
      : { ...IDLE, userId, status: "loading" },
  );
  const promise = api
    .notifications()
    .then((res) => {
      if (state.userId !== userId) return;
      setState({
        ...state,
        status: "ready",
        items: res.notifications,
        unread: res.unread,
        loadedAt: Date.now(),
      });
    })
    .catch(() => {
      if (state.userId === userId && state.status !== "ready") setState({ ...state, status: "error" });
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { userId, promise };
  return promise;
}

function refreshIfStale(userId: string) {
  const stale = state.userId !== userId || state.status === "idle" || state.status === "error";
  if (stale || Date.now() - state.loadedAt > STALE_AFTER_MS) void loadNotifications(userId);
}

export function markAllSeen(userId: string) {
  if (state.userId !== userId || state.unread === 0) return;
  const now = Date.now();
  const fresh = new Set(state.fresh);
  for (const item of state.items) if (item.readAt === null) fresh.add(item.id);
  setState({
    ...state,
    unread: 0,
    fresh,
    items: state.items.map((item) => (item.readAt === null ? { ...item, readAt: now } : item)),
  });
  api.markNotificationsRead({ all: true }).catch(() => undefined);
}

export function forgetFresh() {
  if (state.fresh.size > 0) setState({ ...state, fresh: NONE });
}

export type NotificationsState =
  | { status: "signed_out" }
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | {
      status: "ready";
      userId: string;
      items: Notification[];
      unread: number;
      fresh: ReadonlySet<string>;
    };

export function useNotifications(): NotificationsState {
  const userId = useSessionUserId();
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE,
  );

  useEffect(() => {
    if (!userId) return;
    refreshIfStale(userId);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshIfStale(userId);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId]);

  if (!userId) return { status: "signed_out" };
  if (snapshot.userId !== userId || snapshot.status === "idle" || snapshot.status === "loading") {
    return { status: "loading" };
  }
  if (snapshot.status === "error") {
    return { status: "error", retry: () => void loadNotifications(userId) };
  }
  return {
    status: "ready",
    userId,
    items: snapshot.items,
    unread: snapshot.unread,
    fresh: snapshot.fresh,
  };
}
