"use client";

import { useRef, useState, type ReactNode } from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { patchMe, useMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { fixErrorMessage } from "@/components/studio/editor/fix-text";
import type { Feature, UsagePeriod } from "@/config/plans";
import type { TailorRequirement } from "@/lib/ai/types";
import { budgetReachedText } from "@/lib/ai-budget-copy";
import { api, isApiError, isBudgetReached } from "@/lib/api/client";
import { newId, type Resume } from "@/lib/resume/schema";
import type { LineTarget } from "./apply";
import { lineQuestion } from "./screener";
import type { SavedAnswer, SavedWriting, TailorDraft } from "./session";

// The AI calls the results make on their own: a cover letter, an answer to an application
// question, and a resume line for a requirement the person says they have. Each one goes through
// the account gate, and a double click never spends two.

export type WritingTask = "letter" | "answer" | "line";

export type Writing = {
  busy: WritingTask | null;
  // The last failure, for the tool that made it.
  error: { task: WritingTask; message: string } | null;
  letter: (resume: Resume) => Promise<SavedWriting | null>;
  answer: (resume: Resume, question: string) => Promise<SavedAnswer | null>;
  line: (
    requirement: TailorRequirement,
    target: LineTarget,
    what: string,
  ) => Promise<string | null>;
  dialogs: ReactNode;
};

function errorMessage(
  error: unknown,
  feature: Feature,
  limit: number | undefined,
  period: UsagePeriod | null | undefined,
): string {
  if (isBudgetReached(error)) return budgetReachedText(period);
  if (isApiError(error, "limit_reached")) return OTTO.limit.reached(feature, limit, period);
  if (isApiError(error, "unauthorized")) {
    return "You've been signed out. Sign in again to keep going.";
  }
  if (isApiError(error, "ai_refused")) return error.message;
  if (isApiError(error, "bad_request")) return error.message;
  return fixErrorMessage(error);
}

function jobOf(draft: TailorDraft) {
  return { text: draft.text.trim(), title: draft.title.trim(), company: draft.company.trim() };
}

function roleOf(resume: Resume, target: LineTarget) {
  if (target.section === "experience") {
    const job = resume.experience.find((entry) => entry.id === target.id);
    return { title: job?.title ?? "", company: job?.company ?? "" };
  }
  const project = resume.projects.find((entry) => entry.id === target.id);
  return { title: project?.name ?? "", company: "" };
}

export function useWriting(source: Resume, job: TailorDraft): Writing {
  const gate = useAccountGate();
  const { me } = useMe();
  const [busy, setBusy] = useState<WritingTask | null>(null);
  const [error, setError] = useState<Writing["error"]>(null);
  const running = useRef(false);

  async function run<T>(
    task: WritingTask,
    feature: Feature,
    call: () => Promise<T>,
  ): Promise<T | null> {
    if (running.current) return null;
    running.current = true;
    setError(null);
    try {
      if (!(await gate.requireUser(OTTO.signIn.reason(feature)))) return null;
      setBusy(task);
      return await call();
    } catch (caught) {
      if (!gate.handleApiError(caught, feature)) {
        setError({
          task,
          message: errorMessage(caught, feature, me?.usage?.[feature]?.limit, me?.period),
        });
      }
      return null;
    } finally {
      running.current = false;
      setBusy(null);
    }
  }

  return {
    busy,
    error,
    letter: (resume) =>
      run("letter", "letter", async () => {
        const response = await api.letter({ resume, job: jobOf(job) });
        patchMe({ usage: response.usage });
        const { letter, warnings } = response.result;
        return { text: letter, warnings, demo: response.demo === true };
      }),
    answer: (resume, question) =>
      run("answer", "letter", async () => {
        const response = await api.answer({ resume, job: jobOf(job), question: question.trim() });
        patchMe({ usage: response.usage });
        const { answer, warnings } = response.result;
        return {
          id: newId(),
          question: question.trim(),
          text: answer,
          warnings,
          demo: response.demo === true,
        };
      }),
    // The line fixer's second step: the person's own words are both the line and the answer, so
    // the line it writes holds only what they said.
    line: (requirement, target, what) =>
      run("line", "fix", async () => {
        const answer = what.trim();
        const response = await api.fix({
          bullet: answer,
          role: roleOf(source, target),
          answers: [{ question: lineQuestion(requirement), answer }],
        });
        patchMe({ usage: response.usage });
        return response.result.suggestion;
      }),
    dialogs: gate.dialogs,
  };
}
