"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useMe } from "@/components/account/use-me";
import { errorMessage, type ErrorWords } from "@/components/account/errors";
import { toast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/client";
import EN_APP from "@/i18n/messages/en/app";
import EN_EMAIL from "@/i18n/messages/en/email";
import { api } from "@/lib/api/client";
import type { EmailTrackingAction, EmailTrackingState } from "@/lib/inbound/types";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { APPLICATIONS, queryKeys } from "@/lib/queries/keys";
import { emailTrackingQuery } from "@/lib/queries/options";
import { DAY_MS, MINUTE_MS } from "@/lib/time";

const MARKED_FOR_MS = 30 * DAY_MS;
const WATCH_MS = 10 * MINUTE_MS;

// While someone is setting up (or waiting on a test), the page checks every few seconds for a while.
let watchUntil = 0;
const watchers = new Set<() => void>();

function watchFor(ms: number = WATCH_MS): void {
  watchUntil = Date.now() + ms;
  for (const notify of watchers) notify();
}

function subscribe(notify: () => void) {
  watchers.add(notify);
  return () => watchers.delete(notify);
}

const watching = () => watchUntil;

function pollEvery(state: EmailTrackingState | undefined, until: number): number | false {
  if (!state?.available || !state.address) return false;
  const settingUp =
    state.address.lastEmailAt === null ||
    (state.address.confirm !== null && state.address.confirmedAt === null);
  return Date.now() < until || (settingUp && Date.now() - state.address.createdAt < WATCH_MS)
    ? 5_000
    : 120_000;
}

function trackingQuery(userId: string, until: number) {
  return {
    ...emailTrackingQuery(userId),
    refetchOnWindowFocus: true,
    refetchInterval: (query: { state: { data?: EmailTrackingState } }) =>
      pollEvery(query.state.data, until),
  } as const;
}

function store(userId: string, tracking: EmailTrackingState): void {
  getQueryClient().setQueryData(queryKeys.emailTracking(userId), tracking);
}

function refreshBoard(): void {
  void getQueryClient().invalidateQueries({ queryKey: APPLICATIONS });
}

export function useEmailTracking() {
  const { user } = useMe();
  const userId = user?.id ?? "";
  const client = useAppQueryClient();
  const until = useSyncExternalStore(subscribe, watching, () => 0);
  const query = useQuery({ ...trackingQuery(userId, until), enabled: userId !== "" }, client);
  const tracking = query.data ?? null;
  const newest = tracking?.events[0]?.id ?? null;
  const seen = useRef<string | null>(null);

  // Mail read since the board loaded moved cards on the server: fetch the board again.
  useEffect(() => {
    if (newest === null) return;
    if (seen.current !== null && seen.current !== newest) refreshBoard();
    seen.current = newest;
  }, [newest]);

  return { tracking, loading: query.isPending && userId !== "", userId };
}

// Cards an email changed in the last month, for the small mark on the board.
export function emailedCards(
  tracking: EmailTrackingState | null,
  now: number,
): ReadonlySet<string> {
  const ids = new Set<string>();
  if (!tracking || now === 0) return ids;
  for (const event of tracking.events) {
    if (event.change === "none" || event.undoneAt !== null || !event.applicationId) continue;
    if (event.receivedAt >= now - MARKED_FOR_MS) ids.add(event.applicationId);
  }
  return ids;
}

// The failure toasts in the reader's language.
export type TrackingWords = { failed: (typeof EN_EMAIL)["failed"]; errors: ErrorWords };

const ENGLISH: TrackingWords = { failed: EN_EMAIL.failed, errors: EN_APP.errors };

export function useTrackingWords(): TrackingWords {
  const { failed } = useMessages("email");
  const { errors } = useMessages("app");
  return { failed, errors };
}

async function run(
  userId: string,
  work: () => Promise<{ tracking: EmailTrackingState }>,
  failed: string,
  words: TrackingWords,
): Promise<boolean> {
  try {
    store(userId, (await work()).tracking);
    return true;
  } catch (error) {
    toast({ title: failed, description: errorMessage(error, words.errors), variant: "error" });
    return false;
  }
}

export function trackingAction(
  userId: string,
  body: EmailTrackingAction,
  words: TrackingWords = ENGLISH,
): Promise<boolean> {
  watchFor();
  const { failed } = words;
  const title =
    body.action === "start" ? failed.start : body.action === "handle" ? failed.handle : failed.save;
  return run(userId, () => api.emailTrackingAction(body), title, words);
}

export function stopTracking(userId: string, words: TrackingWords = ENGLISH): Promise<boolean> {
  return run(userId, () => api.stopEmailTracking(), words.failed.stop, words);
}

// Checks every few seconds for a while: after a test email, or while Gmail's confirmation is on its way.
export function watchForMail(): void {
  watchFor();
}

export async function changeFromEmail(
  userId: string,
  id: string,
  action: "undo" | "apply",
  words: TrackingWords = ENGLISH,
): Promise<boolean> {
  const failed = action === "undo" ? words.failed.undo : words.failed.apply;
  const done = await run(userId, () => api.changeFromEmail(id, action), failed, words);
  if (done) refreshBoard();
  return done;
}

export function dismissEmail(
  userId: string,
  id: string,
  words: TrackingWords = ENGLISH,
): Promise<boolean> {
  return run(userId, () => api.dismissEmail(id), words.failed.clear, words);
}
