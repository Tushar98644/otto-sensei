"use client";

import { useEffect, useRef, useState } from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { patchMe, useMe } from "@/components/account/use-me";
import { PLANS, type UsageSnapshot } from "@/config/plans";
import { api, isApiError, isBudgetReached } from "@/lib/api/client";
import type { SummaryOption, SummaryRequestBody } from "@/lib/api/types";
import { EDIT_LABELS } from "@/lib/store/resume-store";
import { fixErrorMessage, problemMessage } from "./fix-text";
import { CHAR_LIMITS } from "./limits";
import { editSection, getResume } from "./use-editor";

const SIGN_IN_REASON = "Sign in, then try Pro free for 3 days for summary help.";

type Mode = SummaryRequestBody["mode"];

export type Ready = {
  status: "ready";
  mode: Mode;
  options: SummaryOption[];
  demo: boolean;
  usage: UsageSnapshot;
  original: string;
  editing: { index: number; draft: string } | null;
};

export type Help =
  | { status: "idle" }
  | { status: "loading"; mode: Mode }
  | { status: "failed"; mode: Mode; message: string }
  | Ready;

const IDLE: Help = { status: "idle" };

export function sameText(a: string, b: string): boolean {
  return a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();
}

export function useSummaryHelp(resumeId: string, focusInput: () => void) {
  const gate = useAccountGate();
  const { me, user } = useMe();
  const [help, setHelp] = useState<Help>(IDLE);
  const gateRef = useRef(gate);
  const requestRef = useRef(0);
  const busyRef = useRef(false);
  const limit = me?.usage?.fix.limit ?? PLANS.free.limits.fix;

  useEffect(() => {
    gateRef.current = gate;
  });

  async function ask(mode: Mode) {
    const resume = getResume(resumeId);
    if (!resume || busyRef.current) return;
    busyRef.current = true;
    try {
      const signedIn = await gateRef.current.requireUser(SIGN_IN_REASON).catch(() => false);
      if (!signedIn) return;
      const id = ++requestRef.current;
      const original = resume.summary;
      setHelp({ status: "loading", mode });
      const body: SummaryRequestBody =
        mode === "write" ? { mode, resume } : { mode, summary: original };
      try {
        const response = await api.summary(body);
        patchMe({ usage: response.usage });
        if (id !== requestRef.current) return;
        const { options } = response.result;
        const demo = response.demo === true;
        setHelp({
          status: "ready",
          mode,
          options,
          demo,
          usage: response.usage,
          original,
          editing: null,
        });
      } catch (error) {
        if (id !== requestRef.current) return;
        let message = fixErrorMessage(error);
        if (gateRef.current.handleApiError(error, "fix")) {
          const limited = { kind: "limit", budget: isBudgetReached(error) } as const;
          message =
            isApiError(error, "limit_reached") || isApiError(error, "upgrade_required")
              ? problemMessage(limited, limit, false, me?.period)
              : SIGN_IN_REASON;
        }
        setHelp({ status: "failed", mode, message });
      }
    } finally {
      busyRef.current = false;
    }
  }

  function close() {
    requestRef.current += 1;
    setHelp(IDLE);
    focusInput();
  }

  function apply(text: string) {
    const summary = text.trim().slice(0, CHAR_LIMITS.summary);
    if (!summary) return;
    editSection(resumeId, "summary", (resume) => ({ ...resume, summary }), {
      label: EDIT_LABELS.summary,
    });
    close();
  }

  function setEditing(editing: Ready["editing"]) {
    setHelp((current) => (current.status === "ready" ? { ...current, editing } : current));
  }

  return {
    help,
    ask,
    close,
    apply,
    setEditing,
    dialogs: gate.dialogs,
    plan: user?.plan,
    period: me?.period ?? null,
    trial: me?.billing.trial !== false,
  };
}

export type SummaryFlow = ReturnType<typeof useSummaryHelp>;
