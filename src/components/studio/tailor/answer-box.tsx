"use client";

import { Copy, MessageSquareText, X } from "lucide-react";
import { useId, useState } from "react";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTextarea } from "@/components/ui/voice-field";
import { wordCount } from "@/lib/ai/writing-guards";
import { DemoNote } from "../demo-note";
import { copyText } from "./letter-panel";
import type { SavedAnswer } from "./session";
import type { Writing } from "./use-writing";

const QUESTION_CHARS = { min: 8, max: 500 } as const;
const ANSWER_CHARS = 3_000;

export type AnswerBoxProps = {
  answers: SavedAnswer[];
  writing: Writing;
  onAsk: (question: string) => Promise<boolean>;
  onEdit: (id: string, text: string) => void;
  onSettle?: (id: string) => void;
  onRemove: (id: string) => void;
};

type AnswerItemProps = {
  answer: SavedAnswer;
  onEdit: (text: string) => void;
  onSettle?: () => void;
  onRemove: () => void;
};

function AnswerItem({ answer, onEdit, onSettle, onRemove }: AnswerItemProps) {
  const labelId = useId();
  return (
    <li className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex items-start justify-between gap-3">
        <p id={labelId} className="min-w-0 text-sm/6 font-medium text-ink">
          {answer.question}
        </p>
        <Button size="icon-sm" variant="ghost" aria-label="Remove this answer" onClick={onRemove}>
          <X />
        </Button>
      </div>
      {answer.demo ? <DemoNote /> : null}
      {answer.warnings.length ? (
        <Alert variant="warn">{answer.warnings.join(" ")}</Alert>
      ) : null}
      <Textarea
        aria-labelledby={labelId}
        autoResize
        maxLength={ANSWER_CHARS}
        value={answer.text}
        onChange={(event) => onEdit(event.target.value)}
        onBlur={onSettle}
        className="text-base/7 sm:text-sm/6"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" variant="secondary" onClick={() => void copyText(answer.text, "answer")}>
          <Copy />
          Copy
        </Button>
        <span className="text-sm text-subtle tabular-nums">{wordCount(answer.text)} words</span>
      </div>
    </li>
  );
}

export function AnswerBox({ answers, writing, onAsk, onEdit, onSettle, onRemove }: AnswerBoxProps) {
  const headingId = useId();
  const [question, setQuestion] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const busy = writing.busy === "answer";
  const failed = writing.error?.task === "answer" ? writing.error.message : null;

  async function ask() {
    const text = question.trim();
    if (text.length < QUESTION_CHARS.min) {
      setProblem("Paste the whole question from the form, such as “Why do you want to work here?”");
      return;
    }
    setProblem(null);
    if (await onAsk(text)) setQuestion("");
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-base/6 font-semibold text-ink">
        Answer an application question
      </h3>
      <Field
        label="The question"
        hint="From your resume and this job. Check every sentence before you paste it: Otto never submits anything."
        error={problem}
      >
        <VoiceTextarea
          autoResize
          maxLength={QUESTION_CHARS.max}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onDictate={setQuestion}
          placeholder="Why do you want to work here?"
        />
      </Field>
      {failed ? <Alert variant="error">{failed}</Alert> : null}
      <Button variant="secondary" loading={busy} onClick={() => void ask()} className="self-start">
        <MessageSquareText />
        Draft an answer
      </Button>
      {busy ? <OttoWorking task="answer" size="sm" /> : null}
      {answers.length ? (
        <ul aria-live="polite" className="flex flex-col gap-4">
          {answers.map((answer) => (
            <AnswerItem
              key={answer.id}
              answer={answer}
              onEdit={(text) => onEdit(answer.id, text)}
              onSettle={onSettle ? () => onSettle(answer.id) : undefined}
              onRemove={() => onRemove(answer.id)}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
