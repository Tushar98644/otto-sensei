"use client";

import { TriangleExclamationPoint } from "lucide-react";
import { StatusPill } from "@/components/ui/status";
import { useId, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Textarea } from "@/components/ui/textarea";
import { singleLine } from "./edits";
import { FIX_ANSWER_LIMITS, hasPlaceholders, splitMarks, splitPlaceholders } from "./fix-text";
import { CHAR_LIMITS } from "./limits";

const LABEL_CLASSES = "text-sm font-medium text-ink";

export type OriginalLineProps = {
  text: string;
  marks?: readonly string[];
};

export function OriginalLine({ text, marks = [] }: OriginalLineProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className={LABEL_CLASSES}>Your line</h3>
      <p className="rounded-xl bg-surface-muted px-4 py-3 text-base/7 text-ink">
        {splitMarks(text, marks).map((part, index) =>
          part.marked ? (
            <mark key={index} className="highlighter text-ink">
              {part.text}
            </mark>
          ) : (
            part.text
          ),
        )}
      </p>
    </div>
  );
}

export function IssueList({ issues }: { issues: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className={LABEL_CLASSES}>What to improve</h3>
      <ul role="list" className="flex flex-col gap-1.5">
        {issues.map((issue, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-ink">
            <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0 text-warn" />
            <span>{issue}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type SuggestionProps = {
  text: string;
  hintId: string;
  asking: boolean;
};

export function Suggestion({ text, hintId, asking }: SuggestionProps) {
  const headingId = useId();
  const blanks = hasPlaceholders(text);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className={LABEL_CLASSES}>
        Otto&apos;s version
      </h3>
      <div className="flex flex-col gap-2 border-b border-border-strong py-2.5 sm:flex-row sm:items-start sm:gap-3">
        <p className="min-w-0 flex-1 text-base/7 text-ink">
          {splitPlaceholders(text).map((part, index) =>
            part.placeholder ? (
              <mark key={index} className="rounded-sm bg-warn-soft px-1 font-medium text-warn-ink">
                {part.text}
              </mark>
            ) : (
              part.text
            ),
          )}
        </p>
        <span className="shrink-0 sm:mt-0.5">
          {blanks ? (
            <StatusPill status="warn">Fill the blanks</StatusPill>
          ) : (
            <StatusPill status="pass">New line</StatusPill>
          )}
        </span>
      </div>
      {blanks ? (
        <p id={hintId} className="text-sm text-muted">
          Words in [brackets] are blanks for your real facts.{" "}
          {asking
            ? "Answer the questions below, or edit the line yourself."
            : "Edit the line to fill them in."}
        </p>
      ) : null}
    </section>
  );
}

export type QuestionsFormProps = {
  idPrefix: string;
  questions: string[];
  answers: string[];
  refining: boolean;
  onAnswer: (index: number, value: string) => void;
  onSubmit: () => void;
};

export function answerInputId(idPrefix: string, index: number): string {
  return `${idPrefix}-answer-${index}`;
}

export function updateButtonId(idPrefix: string): string {
  return `${idPrefix}-update`;
}

export function QuestionsForm({
  idPrefix,
  questions,
  answers,
  refining,
  onAnswer,
  onSubmit,
}: QuestionsFormProps) {
  const headingId = useId();
  const answered = answers.some((answer) => answer.trim() !== "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (answered && !refining) onSubmit();
  }

  return (
    <form
      aria-labelledby={headingId}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl bg-surface-muted p-4"
    >
      <h3 id={headingId} className={LABEL_CLASSES}>
        A few quick questions
      </h3>
      {questions.map((question, index) => (
        <Field key={index} label={question} optional>
          <Input
            id={answerInputId(idPrefix, index)}
            value={answers[index] ?? ""}
            onChange={(event) => onAnswer(index, event.target.value)}
            maxLength={FIX_ANSWER_LIMITS.answerChars}
          />
        </Field>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          id={updateButtonId(idPrefix)}
          type="submit"
          variant="secondary"
          loading={refining}
          disabled={!answered}
        >
          Update suggestion
        </Button>
        {answered ? null : <p className="text-sm text-muted">Answer at least one to update it.</p>}
      </div>
      {refining ? <OttoWorking task="fix" size="sm" /> : null}
    </form>
  );
}

export type DraftFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function DraftField({ id, value, onChange, onSubmit }: DraftFieldProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (value.trim()) onSubmit();
  }

  return (
    <Field
      label="Your version"
      hint={
        hasPlaceholders(value)
          ? "Swap the [blanks] for your real facts before you use it."
          : "Change anything you like. Nothing changes on your resume until you use it."
      }
    >
      <Textarea
        id={id}
        autoResize
        value={value}
        maxLength={CHAR_LIMITS.bullet}
        onChange={(event) => onChange(singleLine(event.target.value))}
        onKeyDown={handleKeyDown}
      />
    </Field>
  );
}
