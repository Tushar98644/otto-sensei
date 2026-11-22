"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { useMe } from "@/components/account/use-me";
import { useReminderChoice } from "@/components/setup/use-reminder-choice";
import { errorMessage } from "@/components/account/errors";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import type { EmailTrackingAction, EmailTrackingState } from "@/lib/inbound/types";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { APPLICATIONS, queryKeys } from "@/lib/queries/keys";
import { reminderPromptShows } from "@/lib/setup/checklist";
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

function emailTrackingQuery(userId: string, until: number) {
  return {
    queryKey: queryKeys.emailTracking(userId),
    queryFn: async () => (await api.emailTracking()).tracking,
    staleTime: 30_000,
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
  const query = useQuery({ ...emailTrackingQuery(userId, until), enabled: userId !== "" }, client);
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

// One prompt at a time: while the reminders card waits for an answer (or might), email setup waits.
export function useOtherPromptFirst(applications: number): boolean {
  const pro = useProTools();
  const { user } = useMe();
  const asks = pro === true && applications > 0;
  const reminders = useReminderChoice(user?.id ?? null, asks);
  if (reminders.status === "loading") return true;
  return reminderPromptShows({ pro: pro === true, applications, reminders: reminders.value });
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

async function run(
  userId: string,
  work: () => Promise<{ tracking: EmailTrackingState }>,
  failed: string,
): Promise<boolean> {
  try {
    store(userId, (await work()).tracking);
    return true;
  } catch (error) {
    toast({ title: failed, description: errorMessage(error), variant: "error" });
    return false;
  }
}

export function trackingAction(userId: string, body: EmailTrackingAction): Promise<boolean> {
  watchFor();
  const failed =
    body.action === "start"
      ? "Couldn't set up your address"
      : body.action === "handle"
        ? "Couldn't change your address"
        : "Couldn't save that";
  return run(userId, () => api.emailTrackingAction(body), failed);
}

export function stopTracking(userId: string): Promise<boolean> {
  return run(userId, () => api.stopEmailTracking(), "Couldn't turn it off");
}

export function waitForTest(): void {
  watchFor();
}

export async function changeFromEmail(
  userId: string,
  id: string,
  action: "undo" | "apply",
): Promise<boolean> {
  const failed = action === "undo" ? "Couldn't undo that" : "Couldn't apply that";
  const done = await run(userId, () => api.changeFromEmail(id, action), failed);
  if (done) refreshBoard();
  return done;
}

export function dismissEmail(userId: string, id: string): Promise<boolean> {
  return run(userId, () => api.dismissEmail(id), "Couldn't clear that");
}
