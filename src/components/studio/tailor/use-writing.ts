"use client";

import { useRef, useState, type ReactNode } from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { patchMe, useMe } from "@/components/account/use-me";
import type { OttoLines } from "@/components/mascot/lines";
import { useOtto } from "@/components/mascot/use-otto";
import { fixErrorMessage } from "@/components/studio/editor/fix-text";
import type { Feature, UsagePeriod } from "@/config/plans";
import type { TailorRequirement } from "@/lib/ai/types";
import { api, isApiError, isBudgetReached } from "@/lib/api/client";
import { newId, type Resume } from "@/lib/resume/schema";
import type { LineTarget } from "./apply";
import { lineQuestion } from "./line-question";
import type { SavedAnswer, SavedWriting, TailorDraft } from "./session";

export type WritingTask = "letter" | "answer" | "outreach" | "line";

export type OutreachDraft = {
  subject: string;
  email: string;
  note: string;
  warnings: string[];
  demo: boolean;
};

export type Writing = {
  busy: WritingTask | null;
  error: { task: WritingTask; message: string } | null;
  letter: (resume: Resume) => Promise<SavedWriting | null>;
  answer: (resume: Resume, question: string) => Promise<SavedAnswer | null>;
  outreach: (
    resume: Resume,
    followUp?: { days: number },
    thankYou?: { to: string },
  ) => Promise<OutreachDraft | null>;
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
  otto: OttoLines,
): string {
  if (isBudgetReached(error)) return otto.budget(period);
  if (isApiError(error, "limit_reached")) return otto.limit.reached(feature, limit, period);
  if (isApiError(error, "unauthorized")) return otto.signedOut;
  if (isApiError(error, "ai_refused")) return error.message;
  if (isApiError(error, "bad_request")) return error.message;
  return fixErrorMessage(error, otto);
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
  const otto = useOtto();
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
      if (!(await gate.requireUser(otto.signIn.reason(feature)))) return null;
      setBusy(task);
      return await call();
    } catch (caught) {
      if (!gate.handleApiError(caught, feature)) {
        setError({
          task,
          message: errorMessage(caught, feature, me?.usage?.[feature]?.limit, me?.period, otto),
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
    outreach: (resume, followUp, thankYou) =>
      run("outreach", "letter", async () => {
        const response = await api.outreach({ resume, job: jobOf(job), followUp, thankYou });
        patchMe({ usage: response.usage });
        const { subject, email, note, warnings } = response.result;
        return { subject, email, note, warnings, demo: response.demo === true };
      }),
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
