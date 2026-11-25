"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { useMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import type { UsagePeriod } from "@/config/plans";
import { useMessages } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { budgetReachedText } from "@/lib/ai-budget-copy";
import { isApiError, isBudgetReached } from "@/lib/api/client";
import type { Resume } from "@/lib/resume/schema";
import { loadResult, sameRun, type SavedResult, type TailorDraft } from "./session";
import {
  cancelTailorTask,
  forgetTailorTask,
  startTailorTask,
  tailorTaskFor,
  type TailorTask,
} from "./tailor-task";

export const MIN_POST_CHARS = 80;

export const compareActionKind = (sourceId: string) => `compare:${sourceId}`;

export type ResultPatch = Partial<Pick<SavedResult, "choices" | "letter" | "answers" | "copyId">>;

export type TailorRun = {
  last: SavedResult | null;
  loading: boolean;
  startedAt: number | null;
  error: string | null;
  cancelled: boolean;
  start: (job: TailorDraft) => Promise<void>;
  cancel: () => void;
  update: (id: string, patch: ResultPatch) => void;
  clear: () => void;
  signIn: () => Promise<boolean>;
  dialogs: ReactNode;
};

function errorMessage(
  t: Messages["studioTailor"]["errors"],
  error: unknown,
  tailorLimit: number | undefined,
  period: UsagePeriod | null | undefined,
): string {
  if (isApiError(error, "network_error")) return OTTO.errors.offline;
  if (isApiError(error, "rate_limited")) return OTTO.errors.rateLimited;
  if (isApiError(error, "ai_unavailable")) return OTTO.errors.aiUnavailable;
  if (isBudgetReached(error)) return budgetReachedText(period);
  if (isApiError(error, "limit_reached")) return OTTO.limit.reached("tailor", tailorLimit, period);
  if (isApiError(error, "unauthorized")) return t.signedOut;
  if (isApiError(error, "ai_refused")) return t.refused;
  if (isApiError(error, "bad_request")) return t.badPost;
  return OTTO.errors.generic;
}

export function useTailorRun(source: Resume): TailorRun {
  const gate = useAccountGate();
  const { me } = useMe();
  // A run started before this workspace mounted (the step was left, or the page reloaded) is adopted.
  const [task, setTask] = useState(() => tailorTaskFor(source));
  const [last, setLast] = useState<SavedResult | null>(() => task?.done ?? loadResult(source.id));
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const busy = useRef(false);
  const t = useMessages("studioTailor").errors;

  const signIn = () =>
    gate.requireUser(OTTO.signIn.reason("tailor"), { kind: compareActionKind(source.id) });

  function report(caught: unknown) {
    if (!gate.handleApiError(caught, "tailor"))
      setError(errorMessage(t, caught, me?.usage?.tailor.limit, me?.period));
  }

  const settle = useEffectEvent(
    (settled: TailorTask, saved: SavedResult | null, caught: unknown) => {
      forgetTailorTask(source.id, settled);
      setTask(null);
      if (saved) setLast(saved);
      // Only a run picked up after a reload gets not_found, when the server kept no answer for it.
      else if (!isApiError(caught, "not_found")) report(caught);
    },
  );

  useEffect(() => {
    if (!task) return;
    let live = true;
    task.promise.then(
      (saved) => {
        if (live) settle(task, saved, null);
      },
      (caught: unknown) => {
        if (live) settle(task, null, caught);
      },
    );
    return () => {
      live = false;
    };
  }, [task]);

  async function start(job: TailorDraft) {
    if (busy.current || task) return;
    if (last && sameRun(last, source, job)) {
      setError(null);
      return;
    }
    busy.current = true;
    setError(null);
    setCancelled(false);
    try {
      if (!(await signIn())) return;
      setTask(startTailorTask(source, job));
    } catch (caught) {
      report(caught);
    } finally {
      busy.current = false;
    }
  }

  const update = useCallback(
    (id: string, patch: ResultPatch) =>
      setLast((current) => (current?.id === id ? { ...current, ...patch } : current)),
    [],
  );

  return {
    last,
    loading: task !== null && task.done === null,
    startedAt: task?.startedAt ?? null,
    error,
    cancelled,
    start,
    cancel: () => {
      if (!task || task.done) return;
      cancelTailorTask(source.id, task);
      setTask(null);
      setCancelled(true);
    },
    update,
    clear: () => {
      setLast(null);
      setError(null);
      setCancelled(false);
    },
    signIn,
    dialogs: gate.dialogs,
  };
}
