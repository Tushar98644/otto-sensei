"use client";

import { TriangleExclamationPoint } from "lucide-react";
import { memo, useEffect, useId, useRef, useState } from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { patchMe, useMe } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { OttoMark } from "@/components/site/otto-mark";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PLANS, type UsageSnapshot } from "@/config/plans";
import { api, isApiError } from "@/lib/api/client";
import {
  SUMMARY_IMPROVE_CHARS,
  type SummaryOption,
  type SummaryOptionKind,
  type SummaryRequestBody,
} from "@/lib/api/types";
import { listBullets } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { EDIT_LABELS } from "@/lib/store/resume-store";
import { DemoNote } from "../demo-note";
import {
  fixAllowanceText,
  fixErrorMessage,
  hasPlaceholders,
  problemMessage,
  splitPlaceholders,
} from "./fix-text";
import { CHAR_LIMITS } from "./limits";
import { editSection, getResume, useResumeValue } from "./use-editor";

const MAX_LABEL = CHAR_LIMITS.summary.toLocaleString("en-US");
const SIGN_IN_REASON = "Sign in, then try Pro free for 3 days for summary help.";

type Mode = SummaryRequestBody["mode"];

type Ready = {
  status: "ready";
  mode: Mode;
  options: SummaryOption[];
  demo: boolean;
  usage: UsageSnapshot;
  // The summary as it was when Otto was asked, to say how much shorter his version is.
  original: string;
  // Index of the option being edited, and its text.
  editing: { index: number; draft: string } | null;
};

type Help =
  | { status: "idle" }
  | { status: "loading"; mode: Mode }
  | { status: "failed"; mode: Mode; message: string }
  | Ready;

const IDLE: Help = { status: "idle" };

const KIND_LABELS: Record<SummaryOptionKind, string> = {
  achievements: "Leads with results",
  role: "Leads with your role",
  tightened: "Tighter version",
};

function wordsIn(text: string): number {
  return text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}

function sameText(a: string, b: string): boolean {
  return a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();
}

function hasFacts(resume: Resume): boolean {
  return (
    listBullets(resume).some((bullet) => bullet.text.trim() !== "") ||
    resume.experience.some((job) => job.title.trim() !== "") ||
    resume.basics.headline.trim() !== ""
  );
}

function ottoLine(help: Help): string {
  switch (help.status) {
    case "idle":
    case "loading":
      return help.status === "loading" && help.mode === "improve"
        ? "Tightening your summary. Same facts, fewer words."
        : "Reading your resume for its strongest facts. One moment.";
    case "failed":
      return help.message;
    case "ready": {
      const [first] = help.options;
      if (!first) return "I need a bit more to go on. Add a job or a few lines first.";
      if (help.mode === "improve") {
        return sameText(first.text, help.original)
          ? "Yours already reads well. I'd keep it as it is."
          : "Same facts, fewer words. Use it, edit it, or keep yours.";
      }
      return help.options.length > 1
        ? "Two takes, built only from your resume. Pick one, edit it, or keep yours."
        : "One take, built only from your resume. Use it, edit it, or keep yours.";
    }
  }
}

function ottoMeta(help: Help): string | undefined {
  if (help.status !== "ready" || help.options.length === 0) return undefined;
  if (help.mode === "write") return help.options.length > 1 ? "2 takes" : "1 take";
  const after = help.options[0]?.text ?? "";
  return `${wordsIn(help.original)} → ${wordsIn(after)} words`;
}

function useSummaryHelp(resumeId: string, focusInput: () => void) {
  const gate = useAccountGate();
  const { me, user } = useMe();
  const [help, setHelp] = useState<Help>(IDLE);
  // Read after awaits, when the render that started the request may hold a signed-out gate.
  const gateRef = useRef(gate);
  // Bumped by every request and by closing; an answer for an older number is dropped.
  const requestRef = useRef(0);
  // A double tap must not spend two fixes.
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
        // Strict check: a server from before the flag existed omits it, and its results were real.
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
          message =
            isApiError(error, "limit_reached") || isApiError(error, "upgrade_required")
              ? problemMessage({ kind: "limit" }, limit, false, me?.period)
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

export const SummaryEditor = memo(function SummaryEditor({ resumeId }: { resumeId: string }) {
  const summary = useResumeValue(resumeId, (resume) => resume.summary, "");
  const canWrite = useResumeValue(resumeId, hasFacts, false);
  const id = useId();
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;
  const countId = `${id}-count`;
  const panelRef = useRef<HTMLElement>(null);
  const flow = useSummaryHelp(resumeId, () => document.getElementById(inputId)?.focus());
  const { help } = flow;
  const working = help.status === "loading";
  const canImprove = summary.trim().length >= SUMMARY_IMPROVE_CHARS.min;

  // Otto's answer replaces his working figure in place; moving focus there lets keyboards act on
  // it next.
  const settled = help.status === "ready" || help.status === "failed";
  useEffect(() => {
    if (settled) panelRef.current?.focus();
  }, [settled]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId} className="sr-only">
        Summary
      </Label>
      <Textarea
        id={inputId}
        autoResize
        value={summary}
        onChange={(event) => {
          const text = event.target.value;
          editSection(resumeId, "summary", (resume) => ({ ...resume, summary: text }));
        }}
        maxLength={CHAR_LIMITS.summary}
        aria-describedby={`${hintId} ${countId}`}
        placeholder="Product designer with 6 years in fintech. Turns messy sign-up flows into simple ones and works best close to engineering."
        className="min-h-28"
      />
      <div className="flex items-start justify-between gap-4 text-sm text-muted">
        <p id={hintId}>
          Two or three sentences: what you do, what you&apos;re best at, and what you want next.
        </p>
        <p id={countId} className="shrink-0 tabular-nums">
          {summary.length.toLocaleString("en-US")} / {MAX_LABEL}
          <span className="sr-only"> characters</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 max-sm:h-11"
          disabled={!canWrite || working}
          loading={working && help.mode === "write"}
          onClick={() => void flow.ask("write")}
        >
          <OttoMark tone="line" small className="size-5 text-ink" />
          Write with Otto
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="max-sm:h-11"
          disabled={!canImprove || working}
          loading={working && help.mode === "improve"}
          onClick={() => void flow.ask("improve")}
        >
          Improve mine
        </Button>
        {canWrite ? null : (
          <p className="text-sm text-muted">Add a job or a few lines and Otto can draft one.</p>
        )}
      </div>
      {help.status === "idle" ? null : (
        <section
          ref={panelRef}
          tabIndex={-1}
          aria-labelledby={`${id}-help`}
          aria-busy={working || undefined}
          className="flex flex-col gap-4 rounded-2xl bg-surface-muted p-4 outline-none"
        >
          <h3 id={`${id}-help`} className="sr-only">
            Otto&apos;s summary help
          </h3>
          <OttoNote size="sm" meta={ottoMeta(help)} message={ottoLine(help)} />
          {working ? <OttoWorking task="summary" size="sm" /> : null}
          {help.status === "ready" ? <ReadyOptions flow={flow} state={help} baseId={id} /> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={flow.close}>
              {help.status === "ready" && help.options.length > 0 ? "Keep mine" : "Close"}
            </Button>
            {help.status === "failed" ? (
              <Button variant="secondary" size="sm" onClick={() => void flow.ask(help.mode)}>
                Try again
              </Button>
            ) : null}
          </div>
        </section>
      )}
      {flow.dialogs}
    </div>
  );
});

type Flow = ReturnType<typeof useSummaryHelp>;

function ReadyOptions({ flow, state, baseId }: { flow: Flow; state: Ready; baseId: string }) {
  const unchanged =
    state.mode === "improve" && sameText(state.options[0]?.text ?? "", state.original);
  const allowance = fixAllowanceText(state.usage.fix, flow.plan, flow.period, flow.trial);
  return (
    <>
      {unchanged ? null : (
        <ul role="list" className="flex flex-col divide-y divide-border">
          {state.options.map((option, index) => (
            <OptionRow
              key={option.kind}
              option={option}
              id={`${baseId}-option-${index}`}
              draft={state.editing?.index === index ? state.editing.draft : null}
              onEdit={(draft) => flow.setEditing(draft === null ? null : { index, draft })}
              onUse={flow.apply}
            />
          ))}
        </ul>
      )}
      {state.demo ? <DemoNote /> : null}
      {allowance ? <p className="text-sm text-muted">{allowance}</p> : null}
    </>
  );
}

type OptionRowProps = {
  option: SummaryOption;
  id: string;
  // The person's edit of this option; null while it's shown as Otto wrote it.
  draft: string | null;
  onEdit: (draft: string | null) => void;
  onUse: (text: string) => void;
};

function OptionRow({ option, id, draft, onEdit, onUse }: OptionRowProps) {
  const blanks = hasPlaceholders(option.text);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const editing = draft !== null;

  useEffect(() => {
    if (editing) draftRef.current?.focus();
  }, [editing]);

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <Eyebrow>{KIND_LABELS[option.kind]}</Eyebrow>
      {draft === null ? (
        <p className="text-base/7 text-pretty text-ink">
          {splitPlaceholders(option.text).map((part, index) =>
            part.placeholder ? (
              <mark key={index} className="rounded-sm bg-warn-soft px-1 font-medium text-warn-ink">
                {part.text}
              </mark>
            ) : (
              part.text
            ),
          )}
        </p>
      ) : (
        <>
          <Label htmlFor={`${id}-draft`} className="sr-only">
            Your version
          </Label>
          <Textarea
            ref={draftRef}
            id={`${id}-draft`}
            autoResize
            value={draft}
            maxLength={CHAR_LIMITS.summary}
            onChange={(event) => onEdit(event.target.value)}
            className="min-h-28"
          />
        </>
      )}
      {option.warnings.length > 0 ? (
        <ul role="list" className="flex flex-col gap-1.5">
          {option.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2 text-sm text-ink">
              <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {blanks && draft === null ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          Words in [brackets] are blanks for your real facts. Edit it to fill them in.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {draft === null ? (
          <Button variant="secondary" size="sm" onClick={() => onEdit(option.text)}>
            Edit first
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => onEdit(null)}>
            Cancel edit
          </Button>
        )}
        <Button
          size="sm"
          disabled={draft === null ? blanks : !draft.trim()}
          aria-describedby={blanks && draft === null ? `${id}-hint` : undefined}
          onClick={() => onUse(draft ?? option.text)}
        >
          Use this
        </Button>
      </div>
    </li>
  );
}
