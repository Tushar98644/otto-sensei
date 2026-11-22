"use client";

import { useSyncExternalStore } from "react";
import { reloadNotifications } from "@/components/notifications/use-notifications";
import { api } from "@/lib/api/client";
import { readItem, writeItem } from "@/lib/browser-storage";
import type { Recap, RecapIndex, RecapWeekId } from "@/lib/recap/types";

// Kept per user id for the page's life: the server builds a week once, this asks once per load.

type State = {
  userId: string | null;
  status: "idle" | "loading" | "ready" | "error";
  index: RecapIndex | null;
  // The week on screen, or null when the story is closed.
  open: RecapWeekId | null;
  // Earlier weeks read once, by week.
  weeks: ReadonlyMap<RecapWeekId, Recap>;
};

const NO_WEEKS: ReadonlyMap<RecapWeekId, Recap> = new Map();
const IDLE: State = { userId: null, status: "idle", index: null, open: null, weeks: NO_WEEKS };

let state: State = IDLE;
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

function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

// The week this browser last saw ready, so Home can hold the card's place before it loads.
const keyOf = (userId: string) => `otto-recap-week:${userId}`;

export function rememberedWeek(userId: string | null): RecapWeekId | null {
  return userId ? readItem(keyOf(userId)) || null : null;
}

export function loadRecapIndex(userId: string): void {
  if (state.userId === userId && state.status !== "idle" && state.status !== "error") return;
  setState({ ...IDLE, userId, status: "loading" });
  api
    .ensureRecap({ timeZone: deviceTimeZone() })
    .then(({ current, earlier }) => {
      if (state.userId !== userId) return;
      setState({ ...state, status: "ready", index: { current, earlier } });
      writeItem(keyOf(userId), current?.recap.week ?? "");
      // A week built just now also rang the bell.
      if (current && !current.seen) reloadNotifications();
    })
    .catch(() => {
      if (state.userId === userId) setState({ ...state, status: "error" });
    });
}

// Once the story is on screen: from then on it waits on Home as a card.
export function markRecapSeen(week: RecapWeekId) {
  const current = state.index?.current;
  if (!current || current.recap.week !== week || current.seen) return;
  setState({ ...state, index: { ...state.index!, current: { ...current, seen: true } } });
  api.markRecapSeen({ week }).catch(() => undefined);
}

export function openRecap(week: RecapWeekId) {
  setState({ ...state, open: week });
}

export function closeRecap() {
  if (state.open !== null) setState({ ...state, open: null });
}

export function rememberWeek(recap: Recap) {
  if (state.weeks.has(recap.week)) return;
  setState({ ...state, weeks: new Map(state.weeks).set(recap.week, recap) });
}

export function recapFor(snapshot: RecapSnapshot, week: RecapWeekId): Recap | null {
  const current = snapshot.index?.current?.recap;
  if (current?.week === week) return current;
  return snapshot.weeks.get(week) ?? null;
}

export type RecapSnapshot = Pick<State, "status" | "index" | "open" | "weeks">;

export function useRecap(userId: string | null): RecapSnapshot {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE,
  );
  return snapshot.userId === userId ? snapshot : IDLE;
}
