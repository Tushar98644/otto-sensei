"use client";

import { useEffect, useId, useMemo, type ReactNode } from "react";
import { useMe } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PLANS, type PlanId, type UsagePeriod } from "@/config/plans";
import { useMessages } from "@/i18n/client";
import { useStudioStore } from "@/lib/store/resume-store";
import { countText } from "../count";
import { DemoNote } from "../demo-note";
import {
  answerInputId,
  DraftField,
  IssueList,
  OriginalLine,
  QuestionsForm,
  Suggestion,
  updateButtonId,
} from "./fix-dialog-parts";
import { weakLinesLeft } from "./fix-queue";
import { fixAllowanceText, hasPlaceholders, problemMessage, type FixWords } from "./fix-text";
import { useFixWords } from "./fix-words";
import { lintOf } from "./lint-cache";
import { pickResume, useBulletIssues } from "./use-editor";
import type { FixFlow, FixReady, FixState } from "./use-fix-flow";

function useLinesLeft(resumeId: string, state: FixState, seen: readonly string[]): number {
  const currentId = state.status === "closed" ? null : state.target.bulletId;
  const skip = useMemo(() => new Set(seen), [seen]);
  return useStudioStore((store) => {
    const resume = currentId ? pickResume(store, resumeId) : undefined;
    return resume && currentId
      ? weakLinesLeft(resume, lintOf(resume).byBullet, currentId, skip)
      : 0;
  });
}

type ReadyView = { lineGood: boolean; asking: boolean; blanks: boolean };

function readyView({ result, target }: FixReady): ReadyView {
  return {
    lineGood:
      result.issues.length === 0 &&
      result.questions.length === 0 &&
      result.suggestion.trim() === target.text,
    asking: result.questions.length > 0,
    blanks: hasPlaceholders(result.suggestion),
  };
}

function ottoLine(
  words: FixWords,
  state: FixState,
  limit: number,
  signedIn: boolean,
  period: UsagePeriod | null,
  plan: PlanId | null,
): string {
  switch (state.status) {
    case "closed":
    case "loading":
      return words.t.otto.working;
    case "failed":
      return problemMessage(words, state.problem, limit, signedIn, period, plan);
    case "ready": {
      const view = readyView(state);
      if (state.refining) return words.t.otto.working;
      if (view.lineGood) return words.t.otto.lineGood;
      if (view.asking && state.draft === null) return words.t.otto.asking;
      return words.t.otto.suggestion;
    }
  }
}

function ottoMeta({ t, format }: FixWords, state: FixState, left: number): string | undefined {
  const count = state.status === "ready" ? state.result.questions.length : 0;
  const parts: string[] = [];
  if (count > 0) parts.push(countText(format, t.counts.questions, count));
  if (left > 0) parts.push(countText(format, t.dialog.linesToGo, left));
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function readyFocusId(baseId: string, state: FixReady): string {
  const view = readyView(state);
  if (view.asking) return answerInputId(baseId, 0);
  if (view.lineGood) return `${baseId}-keep`;
  return view.blanks ? `${baseId}-edit` : `${baseId}-use`;
}

// After a limit or a lost session, the next line would fail the same way.
function canMoveOn(state: FixState, left: number): boolean {
  return left > 0 && !(state.status === "failed" && state.problem.kind !== "error");
}

export function FixDialog({ flow, resumeId }: { flow: FixFlow; resumeId: string }) {
  const { state } = flow;
  const lineIssues = useBulletIssues(
    resumeId,
    state.status === "closed" ? "" : state.target.bulletId,
  );
  const { me, user } = useMe();
  const baseId = useId();
  const limit = me?.usage?.fix.limit ?? PLANS.free.limits.fix;
  const period = me?.period ?? null;
  const plan = user?.plan ?? null;
  const left = useLinesLeft(resumeId, state, flow.seen);
  const next = canMoveOn(state, left);
  const words = useFixWords();
  const t = words.t.dialog;

  const result = state.status === "ready" ? state.result : null;
  const focusId = state.status === "ready" ? readyFocusId(baseId, state) : null;
  const editing = state.status === "ready" && state.draft !== null;
  const failure = state.status === "failed" ? state.problem : null;
  const refineProblem = state.status === "ready" ? state.problem : null;

  useEffect(() => {
    if (result && focusId) document.getElementById(focusId)?.focus();
  }, [result, focusId]);

  useEffect(() => {
    if (editing) document.getElementById(`${baseId}-draft`)?.focus();
  }, [editing, baseId]);

  useEffect(() => {
    if (failure) document.getElementById(`${baseId}-retry`)?.focus();
  }, [failure, baseId]);

  // Disabling the button while it worked dropped focus; hand it back for a retry.
  useEffect(() => {
    if (refineProblem) document.getElementById(updateButtonId(baseId))?.focus();
  }, [refineProblem, baseId]);

  const lineGood = state.status === "ready" && readyView(state).lineGood;
  const keep = (
    <Button
      id={`${baseId}-keep`}
      variant={lineGood && next ? "primary" : "ghost"}
      onClick={next ? flow.skipLine : flow.close}
    >
      {next ? (lineGood ? t.nextLine : t.keepNext) : t.keep}
    </Button>
  );
  let content: ReactNode = null;
  let footer: ReactNode = null;

  switch (state.status) {
    case "closed":
      break;
    case "loading":
      content = <OttoWorking task="fix" size="sm" />;
      footer = keep;
      break;
    case "failed":
      footer = (
        <>
          {keep}
          <Button id={`${baseId}-retry`} onClick={flow.retry}>
            {t.tryAgain}
          </Button>
        </>
      );
      break;
    case "ready":
      content = (
        <ReadyContent
          flow={flow}
          state={state}
          baseId={baseId}
          limit={limit}
          period={period}
          plan={plan}
          signedIn={user !== null}
          next={next}
          allowance={fixAllowanceText(
            words,
            me?.usage?.fix ?? state.usage.fix,
            plan,
            period,
            me?.billing.trial !== false,
          )}
        />
      );
      footer = (
        <ReadyFooter flow={flow} state={state} baseId={baseId} keep={keep} next={next} t={t} />
      );
      break;
  }

  const otto = ottoLine(words, state, limit, user !== null, period, plan);

  return (
    <Dialog
      open={state.status !== "closed"}
      onOpenChange={(open) => {
        if (!open) flow.close();
      }}
      title={t.title}
      size="lg"
      footer={footer}
    >
      {state.status === "closed" ? null : (
        <div aria-busy={state.status === "loading" || undefined} className="flex flex-col gap-5">
          {/* One note for all states: live regions only announce changes to existing text. */}
          <OttoNote size="sm" meta={ottoMeta(words, state, left)} message={otto} />
          <OriginalLine
            text={state.target.text}
            marks={lineIssues.flatMap((issue) => (issue.match ? [issue.match] : []))}
          />
          {content}
        </div>
      )}
    </Dialog>
  );
}

type ReadyProps = { flow: FixFlow; state: FixReady; baseId: string };

function ReadyContent({
  flow,
  state,
  baseId,
  limit,
  period,
  plan,
  signedIn,
  allowance,
  next,
}: ReadyProps & {
  next: boolean;
  limit: number;
  period: UsagePeriod | null;
  plan: PlanId | null;
  signedIn: boolean;
  allowance: string | null;
}) {
  const { result, draft, refining, problem, answers, demo } = state;
  const view = readyView(state);
  const words = useFixWords();
  const demoNote = useMessages("studio").demoNote;

  return (
    <>
      {result.issues.length > 0 ? <IssueList issues={result.issues} /> : null}
      {view.lineGood ? null : draft === null ? (
        <Suggestion text={result.suggestion} hintId={`${baseId}-hint`} asking={view.asking} />
      ) : (
        <DraftField
          id={`${baseId}-draft`}
          value={draft}
          onChange={flow.setDraft}
          onSubmit={() => flow.apply(draft, next ? "next" : "close")}
        />
      )}
      {view.asking && draft === null ? (
        <QuestionsForm
          idPrefix={baseId}
          questions={result.questions}
          answers={answers}
          refining={refining}
          onAnswer={flow.setAnswer}
          onSubmit={() => void flow.refine()}
        />
      ) : null}
      {problem ? (
        <Alert variant={problem.kind === "error" ? "error" : "warn"}>
          {problemMessage(words, problem, limit, signedIn, period, plan)}
        </Alert>
      ) : null}
      {demo ? <DemoNote text={demoNote} /> : null}
      {allowance ? <p className="text-sm text-muted">{allowance}</p> : null}
    </>
  );
}

function ReadyFooter({
  flow,
  state,
  baseId,
  keep,
  next,
  t,
}: ReadyProps & { keep: ReactNode; next: boolean; t: FixWords["t"]["dialog"] }) {
  const view = readyView(state);
  const { draft, refining, result } = state;
  const then = next ? "next" : "close";
  const useLabel = next ? t.useNext : t.use;
  if (view.lineGood) return keep;

  if (draft !== null) {
    return (
      <>
        {keep}
        <Button
          id={`${baseId}-use`}
          onClick={() => flow.apply(draft, then)}
          disabled={!draft.trim()}
        >
          {useLabel}
        </Button>
      </>
    );
  }

  return (
    <>
      {keep}
      <Button
        id={`${baseId}-edit`}
        variant="secondary"
        onClick={flow.startEditing}
        disabled={refining}
      >
        {t.editFirst}
      </Button>
      <Button
        id={`${baseId}-use`}
        onClick={() => flow.apply(result.suggestion, then)}
        disabled={view.blanks || refining}
        aria-describedby={view.blanks ? `${baseId}-hint` : undefined}
      >
        {useLabel}
      </Button>
    </>
  );
}
