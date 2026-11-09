"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { patchMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { toast } from "@/components/ui/toast";
import { TEXT_LIMITS, type UsageSnapshot } from "@/config/plans";
import type { FixResult } from "@/lib/ai/types";
import { api, isApiError } from "@/lib/api/client";
import type { FixResponse } from "@/lib/api/types";
import { findBullet, setBulletText } from "@/lib/resume/ops";
import { EDIT_LABELS } from "@/lib/store/resume-store";
import { buildAnswers, fixErrorMessage, type FixAnswer, type FixProblem } from "./fix-text";
import { flashLine } from "./line-flash";
import { CHAR_LIMITS } from "./limits";
import { editResume, getResume } from "./use-editor";

export type FixTarget = {
  bulletId: string;
  // The line as it was when the dialog opened. Both calls send it, so answers refine one line.
  text: string;
  role: { title: string; company: string };
};

export type FixReady = {
  status: "ready";
  target: FixTarget;
  result: FixResult;
  usage: UsageSnapshot;
  // The server had no AI key, so the result is sample output.
  demo: boolean;
  // One per question in result.questions.
  answers: string[];
  refining: boolean;
  problem: FixProblem | null;
  // The user's own edit of the suggestion. Null until they pick "Edit before using".
  draft: string | null;
};

export type FixState =
  | { status: "closed" }
  | { status: "loading"; target: FixTarget }
  | { status: "failed"; target: FixTarget; problem: FixProblem }
  | FixReady;

type Outcome = { response: FixResponse } | { problem: FixProblem };

const CLOSED: FixState = { status: "closed" };

function readyState(target: FixTarget, response: FixResponse): FixReady {
  return {
    status: "ready",
    target,
    result: response.result,
    usage: response.usage,
    // Strict check: a server from before the flag existed omits it, and its results were real.
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
  // Async callbacks read the latest gate through this, so `open` stays stable for every line.
  const gateRef = useRef(gate);
  // Bumped by every request and by closing. A response for an older number is ignored.
  const requestRef = useRef(0);
  // True from a tap on "Fix with Otto" until the dialog closes, so a double tap can't spend two
  // fixes on one line.
  const busyRef = useRef(false);

  useEffect(() => {
    gateRef.current = gate;
  });

  const send = useCallback(
    async (target: FixTarget, answers: FixAnswer[]): Promise<Outcome | null> => {
      const id = ++requestRef.current;
      try {
        const response = await api.fix({ bullet: target.text, role: target.role, answers });
        // The server counted it either way, so keep the allowance shown elsewhere in step.
        patchMe({ usage: response.usage });
        return id === requestRef.current ? { response } : null;
      } catch (error) {
        // Checked first: no sign-in or upgrade dialog for a fix the user already walked away from.
        if (id !== requestRef.current) return null;
        if (gateRef.current.handleApiError(error, "fix")) {
          return {
            problem:
              isApiError(error, "limit_reached") || isApiError(error, "upgrade_required")
                ? { kind: "limit" }
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

  // Null when there's nothing to send or the user didn't sign in.
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
        .requireUser(OTTO.signIn.reason("fix"))
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

  const close = useCallback(() => {
    requestRef.current += 1;
    busyRef.current = false;
    setState(CLOSED);
  }, []);

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

  function apply(text: string) {
    if (state.status !== "ready") return;
    const line = text.trim().slice(0, CHAR_LIMITS.bullet);
    if (!line) return;
    const { bulletId } = state.target;
    editResume(resumeId, (resume) => setBulletText(resume, bulletId, line), {
      label: EDIT_LABELS.fix,
    });
    close();
    // Shown on the line itself rather than as a toast in a corner.
    flashLine(bulletId);
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
    open,
    close,
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
