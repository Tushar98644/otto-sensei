"use client";

import { useEffect, useId, type ReactNode } from "react";
import { useMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PLANS, type UsagePeriod } from "@/config/plans";
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
import { FixLauncherContext } from "./fix-launcher";
import { fixAllowanceText, hasPlaceholders, problemMessage } from "./fix-text";
import { useBulletIssues } from "./use-editor";
import { useFixFlow, type FixFlow, type FixReady, type FixState } from "./use-fix-flow";

// Owns the one Fix dialog for the editor, plus the sign-in and upgrade dialogs it may need.
export function FixDialogProvider({
  resumeId,
  children,
}: {
  resumeId: string;
  children: ReactNode;
}) {
  const flow = useFixFlow(resumeId);
  return (
    <FixLauncherContext value={flow.open}>
      {children}
      <FixDialog flow={flow} resumeId={resumeId} />
      {flow.dialogs}
    </FixLauncherContext>
  );
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
  state: FixState,
  limit: number,
  signedIn: boolean,
  period: UsagePeriod | null,
): string {
  switch (state.status) {
    case "closed":
    case "loading":
      return OTTO.fix.working;
    case "failed":
      return problemMessage(state.problem, limit, signedIn, period);
    case "ready": {
      const view = readyView(state);
      if (state.refining) return OTTO.fix.working;
      if (view.lineGood) return OTTO.fix.lineGood;
      if (view.asking && state.draft === null) return OTTO.fix.asking;
      return OTTO.fix.suggestion;
    }
  }
}

// Facts for Otto's meta line: how many questions he has, once he has answered.
function ottoMeta(state: FixState): string | undefined {
  if (state.status !== "ready" || state.result.questions.length === 0) return undefined;
  const count = state.result.questions.length;
  return `${count} ${count === 1 ? "question" : "questions"}`;
}

// The next thing to do once Otto answers: his first question, else the main action.
function readyFocusId(baseId: string, state: FixReady): string {
  const view = readyView(state);
  if (view.asking) return answerInputId(baseId, 0);
  if (view.lineGood) return `${baseId}-keep`;
  return view.blanks ? `${baseId}-edit` : `${baseId}-use`;
}

function FixDialog({ flow, resumeId }: { flow: FixFlow; resumeId: string }) {
  const { state } = flow;
  // The editor's own lint for this line, to mark the exact words it flagged.
  const lineIssues = useBulletIssues(
    resumeId,
    state.status === "closed" ? "" : state.target.bulletId,
  );
  const { me, user } = useMe();
  const baseId = useId();
  const limit = me?.usage?.fix.limit ?? PLANS.free.limits.fix;
  const period = me?.period ?? null;

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

  // The update button was disabled while it worked, which dropped focus. Hand it back for a retry.
  useEffect(() => {
    if (refineProblem) document.getElementById(updateButtonId(baseId))?.focus();
  }, [refineProblem, baseId]);

  const keep = (
    <Button id={`${baseId}-keep`} variant="ghost" onClick={flow.close}>
      Keep mine
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
            Try again
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
          signedIn={user !== null}
          allowance={fixAllowanceText(state.usage.fix, user?.plan, period, me?.billing.trial !== false)}
        />
      );
      footer = <ReadyFooter flow={flow} state={state} baseId={baseId} keep={keep} />;
      break;
  }

  const otto = ottoLine(state, limit, user !== null, period);

  return (
    <Dialog
      open={state.status !== "closed"}
      onOpenChange={(open) => {
        if (!open) flow.close();
      }}
      title="Fix this line"
      size="lg"
      footer={footer}
    >
      {state.status === "closed" ? null : (
        <div aria-busy={state.status === "loading" || undefined} className="flex flex-col gap-5">
          {/* One note across every state: a live region only announces changes to text it
              already holds, so swapping in a new note would go unheard. */}
          <OttoNote size="sm" meta={ottoMeta(state)} message={otto} />
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
  signedIn,
  allowance,
}: ReadyProps & {
  limit: number;
  period: UsagePeriod | null;
  signedIn: boolean;
  allowance: string | null;
}) {
  const { result, draft, refining, problem, answers, demo } = state;
  const view = readyView(state);

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
          onSubmit={() => flow.apply(draft)}
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
          {problemMessage(problem, limit, signedIn, period)}
        </Alert>
      ) : null}
      {demo ? <DemoNote /> : null}
      {allowance ? <p className="text-sm text-muted">{allowance}</p> : null}
    </>
  );
}

function ReadyFooter({ flow, state, baseId, keep }: ReadyProps & { keep: ReactNode }) {
  const view = readyView(state);
  const { draft, refining, result } = state;
  if (view.lineGood) return keep;

  if (draft !== null) {
    return (
      <>
        {keep}
        <Button id={`${baseId}-use`} onClick={() => flow.apply(draft)} disabled={!draft.trim()}>
          Use this line
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
        Edit before using
      </Button>
      <Button
        id={`${baseId}-use`}
        onClick={() => flow.apply(result.suggestion)}
        disabled={view.blanks || refining}
        aria-describedby={view.blanks ? `${baseId}-hint` : undefined}
      >
        Use this line
      </Button>
    </>
  );
}
