"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api/client";
import type { MeResponse } from "@/lib/api/types";

// One shared /api/me fetch for the whole page. Call refreshMe() after sign-in, sign-out, upgrade,
// or any AI call that changes usage.

export type Me = Pick<MeResponse, "user" | "usage" | "period" | "billing" | "auth">;

type MeState = { status: "idle" | "loading" | "ready" | "error"; me: Me | null };

const SERVER_STATE: MeState = { status: "idle", me: null };

let state: MeState = SERVER_STATE;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: MeState) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function refreshMe(): Promise<void> {
  if (inflight) return inflight;
  if (!state.me) setState({ status: "loading", me: null });
  inflight = api
    .me()
    .then((res) =>
      setState({
        status: "ready",
        // A server from before weekly allowances sends no period: that was always the month.
        me: { user: res.user, usage: res.usage, period: res.period ?? null, billing: res.billing, auth: res.auth },
      }),
    )
    .catch(() => setState({ status: "error", me: state.me }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** The signed-in user's id as last loaded, for code outside React that just signed someone in. */
export async function currentUserId(): Promise<string | null> {
  if (!state.me?.user) await refreshMe();
  return state.me?.user?.id ?? null;
}

// Optimistic local update, e.g. after an AI call returns a fresh usage snapshot.
export function patchMe(patch: Partial<Me>) {
  if (state.me) setState({ status: state.status, me: { ...state.me, ...patch } });
}

export function useMe() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  useEffect(() => {
    if (state.status === "idle") void refreshMe();
  }, []);
  return {
    me: snapshot.me,
    user: snapshot.me?.user ?? null,
    loading: snapshot.status === "idle" || snapshot.status === "loading",
    refresh: refreshMe,
  };
}
