"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNow } from "@/components/studio/use-now";
import { api } from "@/lib/api/client";
import type { JobMatchesResponse } from "@/lib/api/types";
import { deviceTimeZone } from "@/lib/eligibility/options";
import type { WorkProfile } from "@/lib/eligibility/profile";
import { lookingForOf } from "@/lib/job-feed/looking-for";
import { matchProfileOf } from "@/lib/job-feed/profile";
import type { JobFilters, LookingForChoice } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";
import {
  forgetMatchesExcept,
  isFreshMatch,
  matchCacheKey,
  recallMatches,
  rememberMatches,
} from "./match-cache";

// One POST /api/jobs/matches per resume, view, filter, page and "Looking for". Only the resume's
// skills, titles and years go out (matchProfileOf), with the card as shown. Status is derived from which request the last answer was
// for, so nothing is set synchronously in an effect. Answers are kept for the tab (match-cache.ts),
// so coming back to the tab shows the last matches at once.

export type JobView = "matches" | "saved";

export type JobMatchesState =
  | { status: "idle" }
  | { status: "loading"; previous: JobMatchesResponse | null }
  | { status: "ready"; data: JobMatchesResponse }
  | { status: "error"; error: unknown };

type Answer = { key: string; data?: JobMatchesResponse; error?: unknown };

const DAY_MS = 24 * 60 * 60 * 1_000;

export function useJobMatches({
  userId,
  resume,
  view,
  filters,
  page,
  choice,
  workProfile,
}: {
  userId: string | null;
  resume: Resume | null;
  view: JobView;
  filters: JobFilters;
  page: number;
  // What the person changed on the "Looking for" card; the rest is guessed.
  choice: LookingForChoice;
  workProfile: WorkProfile | null;
}) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Kept answers are judged against this visit's start, so render and the request agree.
  const [openedAt] = useState(() => Date.now());
  // Years run to today for a job marked "Present"; the day is enough, so the shared clock's
  // ticks don't send a new request every 30 seconds. 0 until the clock is known.
  const now = useNow();
  const day = now === 0 ? 0 : Math.floor(now / DAY_MS);
  const profile = useMemo(
    () => (resume && day > 0 ? matchProfileOf(resume, day * DAY_MS) : null),
    [resume, day],
  );
  const lookingFor = useMemo(
    () => (profile ? lookingForOf(profile, workProfile, choice) : null),
    [profile, workProfile, choice],
  );
  const body = useMemo(
    () =>
      profile
        ? { view, profile, filters, page, lookingFor, deviceTimeZone: deviceTimeZone() }
        : null,
    [profile, view, filters, page, lookingFor],
  );
  const key = body ? `${JSON.stringify(body)}|${attempt}` : null;
  // The server also reads the saved work profile (for "Likely blocked"), so a change to it is a
  // new answer too.
  const cacheKey = matchCacheKey(userId, body ? { body, workProfile } : null);
  const kept = recallMatches(cacheKey);
  // "Try again" always asks; otherwise a fresh kept answer is the answer.
  const useKept = attempt === 0 && isFreshMatch(kept, openedAt);

  useEffect(() => {
    if (!body || !key) return;
    if (attempt === 0 && isFreshMatch(recallMatches(cacheKey), openedAt)) return;
    let current = true;
    api
      .jobMatches(body)
      .then((data) => {
        if (cacheKey) rememberMatches(cacheKey, data, Date.now());
        if (current) setAnswer({ key, data });
      })
      .catch((error: unknown) => {
        if (current) setAnswer({ key, error });
      });
    return () => {
      current = false;
    };
  }, [body, key, cacheKey, attempt, openedAt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  let state: JobMatchesState;
  if (!key) state = { status: "idle" };
  else if (answer?.key === key && answer.data) state = { status: "ready", data: answer.data };
  else if (answer?.key === key) state = { status: "error", error: answer.error };
  else if (kept && useKept) state = { status: "ready", data: kept.data };
  // An old kept answer stays on screen while the new one comes.
  else state = { status: "loading", previous: kept?.data ?? answer?.data ?? null };

  // What patch() changes: the answer on screen, which may be a kept one.
  const shown = useRef<{ key: string; cacheKey: string | null; data: JobMatchesResponse } | null>(
    null,
  );
  useEffect(() => {
    shown.current = key && state.status === "ready" ? { key, cacheKey, data: state.data } : null;
  });

  // Updates the shown answer in place (a job saved or unsaved) without asking again.
  const patch = useCallback((change: (data: JobMatchesResponse) => JobMatchesResponse) => {
    const current = shown.current;
    if (!current) return;
    const data = change(current.data);
    const entry = recallMatches(current.cacheKey);
    // A save changes the Saved view and every count, so other kept answers are out of date.
    forgetMatchesExcept(current.cacheKey);
    if (current.cacheKey && entry) rememberMatches(current.cacheKey, data, entry.at);
    setAnswer({ key: current.key, data });
  }, []);

  return { state, retry, patch, profile, lookingFor };
}
