"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccountGate, useResumeAfterSignIn } from "@/components/account/account-gate";
import { patchMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { toast } from "@/components/ui/toast";
import { TEXT_LIMITS, type UsageSnapshot } from "@/config/plans";
import type { FixResult } from "@/lib/ai/types";
import { api, isApiError, isBudgetReached } from "@/lib/api/client";
import type { FixResponse } from "@/lib/api/types";
import { findBullet, setBulletText } from "@/lib/resume/ops";
import { EDIT_LABELS } from "@/lib/store/resume-store";
import { recallFix, rememberFix } from "./fix-memory";
import { nextWeakLine } from "./fix-queue";
import { buildAnswers, fixErrorMessage, type FixAnswer, type FixProblem } from "./fix-text";
import { flashLine } from "./line-flash";
import { CHAR_LIMITS } from "./limits";
import { lintOf } from "./lint-cache";
import { editResume, getResume } from "./use-editor";

export type FixTarget = {
  bulletId: string;
  text: string;
  role: { title: string; company: string };
};

export type FixReady = {
  status: "ready";
  target: FixTarget;
  result: FixResult;
  usage: UsageSnapshot;
  demo: boolean;
  answers: string[];
  refining: boolean;
  problem: FixProblem | null;
  draft: string | null;
};

export type FixState =
  | { status: "closed" }
  | { status: "loading"; target: FixTarget }
  | { status: "failed"; target: FixTarget; problem: FixProblem }
  | FixReady;

type Outcome = { response: FixResponse } | { problem: FixProblem };

const CLOSED: FixState = { status: "closed" };
const NONE_SEEN: readonly string[] = [];

function readyState(target: FixTarget, response: FixResponse): FixReady {
  return {
    status: "ready",
    target,
    result: response.result,
    usage: response.usage,
    demo: response.demo === true,
    answers: response.result.questions.map(() => ""),
    refining: false,
    problem: null,
    draft: null,
  };
}

export function useFixFlow(resumeId: string) {
  const gate = useAccountGate();
  const [state, setState] = useState<FixState>(CLOSED);
  const [seen, setSeen] = useState<readonly string[]>(NONE_SEEN);
  const gateRef = useRef(gate);
  const requestRef = useRef(0);
  const busyRef = useRef(false);

  useEffect(() => {
    gateRef.current = gate;
  });

  const send = useCallback(
    async (target: FixTarget, answers: FixAnswer[]): Promise<Outcome | null> => {
      const id = ++requestRef.current;
      const request = { bullet: target.text, role: target.role, answers };
      const known = recallFix(request);
      if (known) return { response: known };
      try {
        const response = await api.fix(request);
        patchMe({ usage: response.usage });
        rememberFix(request, response);
        return id === requestRef.current ? { response } : null;
      } catch (error) {
        if (id !== requestRef.current) return null;
        if (gateRef.current.handleApiError(error, "fix")) {
          return {
            problem:
              isApiError(error, "limit_reached") || isApiError(error, "upgrade_required")
                ? { kind: "limit", budget: isBudgetReached(error) }
                : { kind: "signin" },
          };
        }
        return { problem: { kind: "error", message: fixErrorMessage(error) } };
      }
    },
    [],
  );

  const fetchSuggestion = useCallback(
    async (target: FixTarget) => {
      setState({ status: "loading", target });
      const outcome = await send(target, []);
      if (!outcome) return;
      setState(
        "response" in outcome
          ? readyState(target, outcome.response)
          : { status: "failed", target, problem: outcome.problem },
      );
    },
    [send],
  );

  const targetFor = useCallback(
    async (bulletId: string): Promise<FixTarget | null> => {
      const resume = getResume(resumeId);
      const line = resume ? findBullet(resume, bulletId) : null;
      const text = line?.text.trim() ?? "";
      if (!line || !text) return null;
      if (text.length > TEXT_LIMITS.bulletChars) {
        toast({
          title: "This line is too long for Otto",
          description: `Trim it to under ${TEXT_LIMITS.bulletChars} characters, then try again.`,
        });
        return null;
      }
      const signedIn = await gateRef.current
        .requireUser(OTTO.signIn.reason("fix"), { kind: `fix:${resumeId}`, ids: { bulletId } })
        .catch(() => false);
      return signedIn
        ? { bulletId, text, role: { title: line.roleTitle, company: line.company } }
        : null;
    },
    [resumeId],
  );

  const open = useCallback(
    async (bulletId: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      const target = await targetFor(bulletId);
      if (!target) {
        busyRef.current = false;
        return;
      }
      await fetchSuggestion(target);
    },
    [targetFor, fetchSuggestion],
  );

  useResumeAfterSignIn(`fix:${resumeId}`, ({ bulletId }) => {
    if (bulletId) void open(bulletId);
  });

  const close = useCallback(() => {
    requestRef.current += 1;
    busyRef.current = false;
    setSeen(NONE_SEEN);
    setState(CLOSED);
  }, []);

  // The bumped request id drops the old line's answer and stops here if the dialog closes.
  async function moveOn(fromId: string) {
    const token = ++requestRef.current;
    const skip = new Set([...seen, fromId]);
    setSeen([...skip]);
    const signedIn = await gateRef.current
      .requireUser(OTTO.signIn.reason("fix"))
      .catch(() => false);
    for (;;) {
      if (requestRef.current !== token) return;
      const resume = signedIn ? getResume(resumeId) : undefined;
      const nextId = resume ? nextWeakLine(resume, lintOf(resume).byBullet, fromId, skip) : null;
      if (!nextId) {
        close();
        return;
      }
      const target = await targetFor(nextId);
      if (requestRef.current !== token) return;
      if (target) {
        await fetchSuggestion(target);
        return;
      }
      skip.add(nextId);
      setSeen([...skip]);
    }
  }

  function skipLine() {
    if (state.status !== "closed") void moveOn(state.target.bulletId);
  }

  function retry() {
    if (state.status === "failed") void fetchSuggestion(state.target);
  }

  async function refine() {
    if (state.status !== "ready" || state.refining) return;
    const answers = buildAnswers(state.result.questions, state.answers);
    if (answers.length === 0) return;
    const { target } = state;
    setState({ ...state, refining: true, problem: null });
    const outcome = await send(target, answers);
    if (!outcome) return;
    setState((current) => {
      if (current.status !== "ready") return current;
      return "response" in outcome
        ? readyState(target, outcome.response)
        : { ...current, refining: false, problem: outcome.problem };
    });
  }

  function apply(text: string, then: "close" | "next" = "close") {
    if (state.status !== "ready") return;
    const line = text.trim().slice(0, CHAR_LIMITS.bullet);
    if (!line) return;
    const { bulletId } = state.target;
    editResume(resumeId, (resume) => setBulletText(resume, bulletId, line), {
      label: EDIT_LABELS.fix,
    });
    flashLine(bulletId);
    if (then === "next") void moveOn(bulletId);
    else close();
  }

  function setAnswer(index: number, value: string) {
    setState((current) =>
      current.status === "ready"
        ? {
            ...current,
            answers: current.answers.map((answer, i) => (i === index ? value : answer)),
          }
        : current,
    );
  }

  function startEditing() {
    setState((current) =>
      current.status === "ready" ? { ...current, draft: current.result.suggestion } : current,
    );
  }

  function setDraft(value: string) {
    setState((current) => (current.status === "ready" ? { ...current, draft: value } : current));
  }

  return {
    state,
    seen,
    open,
    close,
    skipLine,
    retry,
    refine,
    apply,
    setAnswer,
    startEditing,
    setDraft,
    dialogs: gate.dialogs,
  };
}

export type FixFlow = ReturnType<typeof useFixFlow>;
