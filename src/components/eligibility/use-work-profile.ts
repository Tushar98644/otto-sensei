"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMe } from "@/components/account/use-me";
import { api } from "@/lib/api/client";
import type { WorkProfile } from "@/lib/eligibility/profile";
import { NO_CHOICE, type LookingForChoice } from "@/lib/job-feed/types";

// One shared GET /api/profile per signed-in account, for the Account page form and the job card's
// eligibility check alike. Kept per user id, so signing in as someone else never shows the last
// person's answers.

type State = {
  userId: string | null;
  status: "idle" | "loading" | "ready" | "error";
  profile: WorkProfile | null;
  updatedAt: number | null;
  // What the Jobs tab's "Looking for" card was changed to; read with the profile.
  lookingFor: LookingForChoice;
};

const IDLE: State = {
  userId: null,
  status: "idle",
  profile: null,
  updatedAt: null,
  lookingFor: NO_CHOICE,
};

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

export function loadWorkProfile(userId: string): Promise<void> {
  if (inflight?.userId === userId) return inflight.promise;
  const keep = state.userId === userId;
  setState({
    userId,
    status: "loading",
    profile: keep ? state.profile : null,
    updatedAt: keep ? state.updatedAt : null,
    lookingFor: keep ? state.lookingFor : NO_CHOICE,
  });
  const promise = api
    .workProfile()
    .then((res) => {
      if (state.userId === userId) {
        setState({
          userId,
          status: "ready",
          profile: res.profile,
          updatedAt: res.updatedAt,
          lookingFor: res.lookingFor ?? NO_CHOICE,
        });
      }
    })
    .catch(() => {
      if (state.userId === userId) setState({ ...state, status: "error" });
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { userId, promise };
  return promise;
}

/** After a successful save: every reader sees the new answers at once. */
export function storeWorkProfile(
  userId: string,
  profile: WorkProfile,
  updatedAt: number | null,
  lookingFor: LookingForChoice = state.userId === userId ? state.lookingFor : NO_CHOICE,
) {
  setState({ userId, status: "ready", profile, updatedAt, lookingFor });
}

/** After the "Looking for" card saved: its remote choice is the profile's "Remote only" too. */
export function storeLookingFor(userId: string, lookingFor: LookingForChoice) {
  if (state.userId !== userId || !state.profile) return;
  setState({
    ...state,
    profile: { ...state.profile, remoteOnly: lookingFor.remote },
    lookingFor,
  });
}

export type WorkProfileState =
  // The account isn't known yet.
  | { status: "unknown" }
  | { status: "signed_out" }
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  // updatedAt null: signed in, but nothing saved yet.
  | {
      status: "ready";
      userId: string;
      profile: WorkProfile;
      updatedAt: number | null;
      lookingFor: LookingForChoice;
    };

export function useWorkProfile(): WorkProfileState {
  const { user, loading } = useMe();
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE,
  );
  const userId = user?.id ?? null;

  useEffect(() => {
    if (userId && (state.userId !== userId || state.status === "idle"))
      void loadWorkProfile(userId);
  }, [userId]);

  if (loading) return { status: "unknown" };
  if (!userId) return { status: "signed_out" };
  if (snapshot.userId !== userId || snapshot.status === "idle" || snapshot.status === "loading") {
    return { status: "loading" };
  }
  if (snapshot.status === "error" || !snapshot.profile) {
    return { status: "error", retry: () => void loadWorkProfile(userId) };
  }
  return {
    status: "ready",
    userId,
    profile: snapshot.profile,
    updatedAt: snapshot.updatedAt,
    lookingFor: snapshot.lookingFor,
  };
}
