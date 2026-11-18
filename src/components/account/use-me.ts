"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { ROUTES } from "@/components/site/routes";
import { SEO_PATHS } from "@/lib/seo-pages/paths";
import { api } from "@/lib/api/client";
import type { PlanId } from "@/config/plans";
import type { MeResponse } from "@/lib/api/types";
import { clearSessionHint, hasSessionHint, setSessionHint } from "./session-hint";

export type Me = Pick<MeResponse, "user" | "usage" | "period" | "aiBudget" | "billing" | "auth">;

// `guessed`: a sales page found no session hint and took the visitor as signed out, unasked.
export type MeState = {
  status: "idle" | "loading" | "ready" | "error";
  me: Me | null;
  guessed?: boolean;
};

const SERVER_STATE: MeState = { status: "idle", me: null };
const GUESSED_SIGNED_OUT: MeState = { status: "ready", me: null, guessed: true };
const LOADING: MeState = { status: "loading", me: null };

// Pages whose every account read copes with "signed out".
const SALES_PATHS: ReadonlySet<string> = new Set([
  ROUTES.home,
  ROUTES.pricing,
  ROUTES.login,
  ROUTES.privacy,
  ROUTES.terms,
  ROUTES.refunds,
  ROUTES.acceptableUse,
  SEO_PATHS.jobMatch,
]);

let state: MeState = SERVER_STATE;
// Every patch bumps it: an answer asked for before a sign-in or sign-out is stale and is asked again.
let version = 0;
// The version the store's newest answer was asked at; once current, a stale answer needn't ask again.
let answered = -1;
let inflight: { version: number; promise: Promise<void> } | null = null;
const listeners = new Set<() => void>();

function setState(next: MeState) {
  const was = state.me?.user?.id ?? null;
  state = next;
  if (next.me) {
    const id = next.me.user?.id ?? null;
    if (id === null) clearSessionHint();
    else if (id !== was) setSessionHint();
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function refreshMe(): Promise<void> {
  if (inflight?.version === version) return inflight.promise;
  const asked = version;
  // A guess stays up meanwhile, so the sign-in form never falls back to its skeleton.
  if (!state.me && !state.guessed) setState(LOADING);
  const promise: Promise<void> = api
    .me()
    .then((res) => {
      if (asked !== version) return askAgain();
      answered = asked;
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
      });
    })
    .catch(() => {
      if (asked !== version) return askAgain();
      setState({ status: "error", me: state.me });
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { version: asked, promise };
  return promise;
}

function askAgain(): Promise<void> | undefined {
  return answered === version ? undefined : refreshMe();
}

// The dashboard layout already has what /api/me would answer. Browser only: the store is shared on the server.
export function seedMe(me: Me): void {
  if (!state.me) setState({ status: "ready", me });
}

export function loadMeFor(pathname: string): void {
  const sales = SALES_PATHS.has(pathname);
  if (state.status === "idle") {
    // proxy.ts sends signed-in visitors from home to the dashboard, so home is always signed out.
    const signedOut = pathname === ROUTES.home || (sales && !hasSessionHint());
    if (!signedOut) {
      void refreshMe();
      return;
    }
    setState(GUESSED_SIGNED_OUT);
  }
  if (!state.guessed) return;
  if (!sales) {
    setState(LOADING);
    void refreshMe();
  } else if (pathname === ROUTES.login) {
    // The form shows at once; the answer brings the auth mode and an account for sign-in to patch.
    void refreshMe();
  }
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
  version += 1;
  if (state.me) setState({ status: state.status, me: { ...state.me, ...patch } });
}

export function meSnapshot(): MeState {
  return state;
}

export function viewOf(snapshot: MeState, pathname: string) {
  return {
    me: snapshot.me,
    user: snapshot.me?.user ?? null,
    // A guess carried onto an app page holds only until the answer, which loadMeFor asks for.
    loading:
      snapshot.status === "idle" ||
      snapshot.status === "loading" ||
      (snapshot.guessed === true && !SALES_PATHS.has(pathname)),
    refresh: refreshMe,
  };
}

export function useMe() {
  const snapshot = useSyncExternalStore(subscribe, meSnapshot, () => SERVER_STATE);
  const pathname = usePathname();
  useEffect(() => loadMeFor(pathname), [pathname]);
  return viewOf(snapshot, pathname);
}
