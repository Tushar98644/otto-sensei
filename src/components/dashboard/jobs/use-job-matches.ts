"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNow } from "@/components/studio/use-now";
import { api } from "@/lib/api/client";
import type { JobMatchesResponse } from "@/lib/api/types";
import { deviceTimeZone } from "@/lib/eligibility/options";
import type { WorkProfile } from "@/lib/eligibility/profile";
import { lookingForOf } from "@/lib/job-feed/looking-for";
import { matchProfileOf } from "@/lib/job-feed/profile";
import type { JobFilters, LookingForChoice } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";

// One POST /api/jobs/matches per resume, view, filter, page and "Looking for". Only the resume's
// skills, titles and years go out (matchProfileOf), with the card as shown. Status is derived from which request the last answer was
// for, so nothing is set synchronously in an effect.

export type JobView = "matches" | "saved";

export type JobMatchesState =
  | { status: "idle" }
  | { status: "loading"; previous: JobMatchesResponse | null }
  | { status: "ready"; data: JobMatchesResponse }
  | { status: "error"; error: unknown };

type Answer = { key: string; data?: JobMatchesResponse; error?: unknown };

const DAY_MS = 24 * 60 * 60 * 1_000;

export function useJobMatches({
  resume,
  view,
  filters,
  page,
  choice,
  workProfile,
}: {
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

  useEffect(() => {
    if (!body || !key) return;
    let current = true;
    api
      .jobMatches(body)
      .then((data) => {
        if (current) setAnswer({ key, data });
      })
      .catch((error: unknown) => {
        if (current) setAnswer({ key, error });
      });
    return () => {
      current = false;
    };
  }, [body, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // Updates the shown answer in place (a job saved or unsaved) without asking again.
  const patch = useCallback((change: (data: JobMatchesResponse) => JobMatchesResponse) => {
    setAnswer((last) => (last?.data ? { ...last, data: change(last.data) } : last));
  }, []);

  let state: JobMatchesState;
  if (!key) state = { status: "idle" };
  else if (answer?.key === key && answer.data) state = { status: "ready", data: answer.data };
  else if (answer?.key === key) state = { status: "error", error: answer.error };
  else state = { status: "loading", previous: answer?.data ?? null };
  return { state, retry, patch, profile, lookingFor };
}
