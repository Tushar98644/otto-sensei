"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { ROUTES } from "@/components/site/routes";
import { api } from "@/lib/api/client";
import type { PlanId } from "@/config/plans";
import type { MeResponse } from "@/lib/api/types";

export type Me = Pick<MeResponse, "user" | "usage" | "period" | "aiBudget" | "billing" | "auth">;

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
        me: {
          user: res.user,
          usage: res.usage,
          period: res.period ?? null,
          aiBudget: res.aiBudget ?? null,
          billing: res.billing,
          auth: res.auth,
        },
      }),
    )
    .catch(() => setState({ status: "error", me: state.me }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function signedInUserId(): string | null {
  return state.me?.user?.id ?? null;
}

export function subscribeToMe(listener: () => void): () => void {
  return subscribe(listener);
}

export async function currentUserId(): Promise<string | null> {
  if (!state.me?.user) await refreshMe();
  return state.me?.user?.id ?? null;
}

export async function currentPlan(): Promise<PlanId | null> {
  if (!state.me) await refreshMe();
  if (!state.me) return null;
  return state.me.user?.plan ?? "free";
}

export function patchMe(patch: Partial<Me>) {
  if (state.me) setState({ status: state.status, me: { ...state.me, ...patch } });
}

export function useMe() {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  const pathname = usePathname();
  useEffect(() => {
    // proxy.ts sends signed-in visitors from home to the dashboard, so home is always signed out.
    if (state.status === "idle" && pathname !== ROUTES.home) void refreshMe();
  }, [pathname]);
  return {
    me: snapshot.me,
    user: snapshot.me?.user ?? null,
    loading: snapshot.status === "idle" || snapshot.status === "loading",
    refresh: refreshMe,
  };
}
