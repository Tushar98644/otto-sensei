"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAccountGate,
  useResumeAfterSignIn,
  type AccountGate,
} from "@/components/account/account-gate";
import { meSnapshot, patchMe, refreshMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import type { Feature } from "@/config/plans";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { api, isApiError, isBudgetReached } from "@/lib/api/client";
import type { FixResponse } from "@/lib/api/types";
import { EDIT_LABELS, useStudioStore } from "@/lib/store/resume-store";
import { countText } from "../count";
import {
  applyFixes,
  canAccept,
  FIX_ALL_AT_ONCE,
  needsYou,
  patchItem,
  planFixAll,
  readyPatch,
  stopWaiting,
  type FixAllItem,
} from "./fix-all";
import { recallFix, rememberFix, type FixRequest } from "./fix-memory";
import { weakLines } from "./fix-queue";
import { buildAnswers, fixErrorMessage, type FixAnswer, type FixProblem } from "./fix-text";
import { flashLine } from "./line-flash";
import { lintOf } from "./lint-cache";
import { editResume, getResume } from "./use-editor";

export type FixAllStop = FixProblem | { kind: "user" };

export type FixAllState = {
  open: boolean;
  items: FixAllItem[];
  capped: number;
  stop: FixAllStop | null;
};

type Upsell = { open: boolean; feature?: Feature };

type Asked = { response: FixResponse } | { problem: FixProblem; halt: boolean };

type Run = { halted: boolean };

const CLOSED: FixAllState = { open: false, items: [], capped: 0, stop: null };
const NO_IDS: ReadonlySet<string> = new Set();

// Mirrors useFixFlow's send(): one request per line, and the gate opens sign-in or the trial prompt.
async function askOtto(request: FixRequest, gate: AccountGate): Promise<Asked> {
  const known = recallFix(request);
  if (known) return { response: known };
  try {
    const response = await api.fix({
      bullet: request.bullet,
      role: request.role,
      answers: [...request.answers],
      ...(request.lang ? { lang: request.lang } : {}),
    });
    patchMe({ usage: response.usage });
    rememberFix(request, response);
    return { response };
  } catch (error) {
    if (gate.handleApiError(error, "fix")) {
      const limited = isApiError(error, "limit_reached") || isApiError(error, "upgrade_required");
      return {
        problem: limited ? { kind: "limit", budget: isBudgetReached(error) } : { kind: "signin" },
        halt: true,
      };
    }
    return {
      problem: { kind: "error", message: fixErrorMessage(error) },
      halt: isApiError(error, "rate_limited") || isApiError(error, "network_error"),
    };
  }
}

function fixesLeft(): number | null {
  const usage = meSnapshot().me?.usage?.fix;
  return usage ? Math.max(0, usage.limit - usage.used) : null;
}

function failureMessage(problem: FixProblem): string | null {
  return problem.kind === "error" ? problem.message : null;
}

export function useFixAll(resumeId: string) {
  const gate = useAccountGate();
  const t = useMessages("studioEditor").all.toasts;
  const format = useFormat();
  const [state, setState] = useState<FixAllState>(CLOSED);
  const [upsell, setUpsell] = useState<Upsell>({ open: false });
  const gateRef = useRef(gate);
  const sessionRef = useRef(0);
  const runRef = useRef<Run>({ halted: true });
  const startingRef = useRef(false);

  useEffect(() => {
    gateRef.current = gate;
  });

  const update = useCallback((bulletId: string, patch: Partial<FixAllItem>) => {
    setState((current) => ({ ...current, items: patchItem(current.items, bulletId, patch) }));
  }, []);

  const halt = useCallback((problem: FixProblem, bulletId: string) => {
    runRef.current.halted = true;
    setState((current) => ({
      ...current,
      stop: problem,
      items: stopWaiting(current.items, new Set([bulletId])),
    }));
  }, []);

  // Answers from a closed or restarted session are dropped.
  const ask = useCallback(
    async (item: FixAllItem, answers: readonly FixAnswer[]): Promise<Asked | null> => {
      const session = sessionRef.current;
      const lang = getResume(resumeId)?.lang;
      const asked = await askOtto(
        { bullet: item.text, role: item.role, answers, ...(lang ? { lang } : {}) },
        gateRef.current,
      );
      return sessionRef.current === session ? asked : null;
    },
    [resumeId],
  );

  // Each run has its own stop flag, so a resumed run never shares a queue with a stopped one.
  const run = useCallback(
    async (items: readonly FixAllItem[]) => {
      const control: Run = { halted: false };
      runRef.current = control;
      const queue = [...items];
      const worker = async () => {
        for (let item = queue.shift(); item; item = queue.shift()) {
          if (control.halted) return;
          update(item.bulletId, { status: "working", message: null });
          const asked = await ask(item, []);
          if (!asked) return;
          if ("response" in asked) {
            update(item.bulletId, readyPatch(asked.response.result));
            continue;
          }
          if (asked.halt) {
            control.halted = true;
            halt(asked.problem, item.bulletId);
            return;
          }
          update(item.bulletId, { status: "failed", message: failureMessage(asked.problem) });
        }
      };
      await Promise.all(Array.from({ length: FIX_ALL_AT_ONCE }, worker));
    },
    [ask, halt, update],
  );

  const begin = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      const signedIn = await gateRef.current
        .requireUser(OTTO.signIn.reason("fix"), { kind: `fix-all:${resumeId}` })
        .catch(() => false);
      if (!signedIn) return;
      if (!meSnapshot().me?.user) await refreshMe();
      const plan = meSnapshot().me?.user?.plan ?? null;
      const left = fixesLeft();
      if (plan === "free" || left === 0) {
        setUpsell({ open: true, feature: left === 0 ? "fix" : undefined });
        return;
      }
      const resume = getResume(resumeId);
      const lines = resume ? weakLines(resume, lintOf(resume).byBullet) : [];
      if (lines.length === 0) {
        toast({ title: t.allGood, description: t.allGoodNote });
        return;
      }
      const { items, capped } = planFixAll(lines, left);
      sessionRef.current += 1;
      setState({ open: true, items, capped, stop: null });
      void run(items.filter((item) => item.status === "waiting"));
    } finally {
      startingRef.current = false;
    }
  }, [resumeId, run, t]);

  const start = useCallback(() => void begin(), [begin]);

  useResumeAfterSignIn(`fix-all:${resumeId}`, start);

  const close = useCallback(() => {
    sessionRef.current += 1;
    runRef.current.halted = true;
    setState(CLOSED);
  }, []);

  const stop = useCallback(() => {
    runRef.current.halted = true;
    setState((current) => ({
      ...current,
      stop: current.stop ?? { kind: "user" },
      items: stopWaiting(current.items, NO_IDS),
    }));
  }, []);

  function fixRest() {
    const rest = state.items.filter((item) => item.status === "stopped");
    if (rest.length === 0) return;
    const ids = new Set(rest.map((item) => item.bulletId));
    setState((current) => ({
      ...current,
      stop: null,
      items: current.items.map((item) =>
        ids.has(item.bulletId) ? { ...item, status: "waiting", message: null } : item,
      ),
    }));
    void run(rest);
  }

  async function retry(bulletId: string) {
    const item = state.items.find((entry) => entry.bulletId === bulletId);
    if (!item || item.status !== "failed") return;
    update(bulletId, { status: "working", message: null });
    const asked = await ask(item, []);
    if (!asked) return;
    if ("response" in asked) update(bulletId, readyPatch(asked.response.result));
    else if (asked.halt) halt(asked.problem, bulletId);
    else update(bulletId, { status: "failed", message: failureMessage(asked.problem) });
  }

  async function refine(bulletId: string) {
    const item = state.items.find((entry) => entry.bulletId === bulletId);
    if (!item?.result || item.status !== "ready" || item.refining) return;
    const answers = buildAnswers(item.result.questions, item.answers);
    if (answers.length === 0) return;
    update(bulletId, { refining: true });
    const asked = await ask(item, answers);
    if (!asked) return;
    if ("response" in asked) {
      update(bulletId, readyPatch(asked.response.result));
      return;
    }
    update(bulletId, { refining: false });
    if (asked.problem.kind === "error") toast({ title: asked.problem.message, variant: "error" });
  }

  function setAnswer(bulletId: string, index: number, value: string) {
    setState((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.bulletId === bulletId
          ? { ...item, answers: item.answers.map((answer, i) => (i === index ? value : answer)) }
          : item,
      ),
    }));
  }

  function setDraft(bulletId: string, draft: string | null) {
    update(bulletId, { draft });
  }

  function reject(bulletId: string, rejected: boolean) {
    update(bulletId, { decision: rejected ? "rejected" : "open" });
  }

  function accept(bulletId: string) {
    const item = state.items.find((entry) => entry.bulletId === bulletId);
    const resume = getResume(resumeId);
    if (!item || !resume || !canAccept(item)) return;
    if (applyFixes(resume, [item]).applied.length === 0) {
      toast({ title: t.lineChanged, description: t.newerStays });
      update(bulletId, { decision: "rejected" });
      return;
    }
    editResume(resumeId, (current) => applyFixes(current, [item]).resume, {
      label: EDIT_LABELS.fix,
    });
    update(bulletId, { decision: "accepted" });
    flashLine(bulletId);
  }

  // One edit for every accepted line, so a single Undo takes them all back.
  function acceptAll() {
    const resume = getResume(resumeId);
    if (!resume) return;
    const { items } = state;
    const { applied } = applyFixes(resume, items);
    if (applied.length === 0) {
      toast({ title: t.linesChanged, description: t.newerStays });
      return;
    }
    const label =
      applied.length === 1 ? EDIT_LABELS.fix : fmt(t.fixedLabel, { count: applied.length });
    editResume(resumeId, (current) => applyFixes(current, items).resume, { label });
    const after = getResume(resumeId);
    const done = new Set(applied);
    const decide = (list: readonly FixAllItem[], decision: FixAllItem["decision"]) =>
      list.map((item) => (done.has(item.bulletId) ? { ...item, decision } : item));
    if (decide(items, "accepted").some(needsYou)) {
      setState((current) => ({ ...current, items: decide(current.items, "accepted") }));
    } else {
      close();
    }
    const session = sessionRef.current;
    undoToast({
      title: countText(format, t.fixed, applied.length),
      onUndo: () => {
        const store = useStudioStore.getState();
        if (store.resumes[resumeId] !== after) {
          toast({ title: t.changedSince, description: t.useUndo });
          return;
        }
        store.undo(resumeId);
        if (sessionRef.current === session) {
          setState((current) => ({ ...current, items: decide(current.items, "open") }));
        }
      },
    });
  }

  return {
    state,
    start,
    close,
    stop,
    fixRest,
    retry,
    refine,
    setAnswer,
    setDraft,
    reject,
    accept,
    acceptAll,
    upsell,
    closeUpsell: () => setUpsell({ open: false }),
    dialogs: gate.dialogs,
  };
}

export type FixAll = ReturnType<typeof useFixAll>;
