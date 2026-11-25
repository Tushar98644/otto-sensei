"use client";

import type { LucideIcon } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMessages } from "@/i18n/client";
import { oneLine } from "@/lib/ai/text";
import { WRITING_LIMITS } from "@/lib/writings/schema";
import { cn } from "@/lib/utils";
import { MIN_TARGET_POST_CHARS } from "./write-targets";

const LINK = /^(https?:\/\/|www\.)\S+$/i;
const PANEL =
  "flex flex-col gap-3 rounded-xl bg-surface-muted p-3 motion-safe:animate-fade-in sm:p-4";

type BoxProps = {
  action: { label: string; icon: LucideIcon };
  onCancel: () => void;
  className?: string;
};

// The one thing Otto can't know: the post, pasted once as text or a link.
export function PostBox({
  note,
  action,
  onWrite,
  onCancel,
  className,
}: BoxProps & { note: string; onWrite: (post: string) => void }) {
  const t = useMessages("letters").boxes;
  const id = useId();
  const errorId = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = text.trim();
    if (!LINK.test(value) && value.length < MIN_TARGET_POST_CHARS) {
      setError(value ? t.short : t.pasteFirst);
      return;
    }
    onWrite(value);
  }

  return (
    <form onSubmit={submit} noValidate className={cn(PANEL, className)}>
      <label htmlFor={id} className="text-sm/6 text-pretty text-ink">
        {note}
      </label>
      <Textarea
        id={id}
        rows={4}
        autoFocus
        value={text}
        spellCheck={false}
        placeholder={t.placeholder}
        aria-describedby={error ? errorId : undefined}
        invalid={error !== null}
        onChange={(event) => {
          setText(event.target.value);
          setError(null);
        }}
        className="max-h-60 min-h-28"
      />
      {error ? (
        <p id={errorId} className="text-sm text-fail-ink">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm">
          <action.icon aria-hidden />
          {action.label}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}

export function QuestionBox({
  action,
  onWrite,
  onCancel,
  className,
}: BoxProps & { onWrite: (question: string) => void }) {
  const t = useMessages("letters").boxes;
  const id = useId();
  const errorId = useId();
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (oneLine(question).length < WRITING_LIMITS.question.min) {
      setError(t.questionFirst);
      return;
    }
    onWrite(question.trim());
  }

  return (
    <form onSubmit={submit} noValidate className={cn(PANEL, className)}>
      <label htmlFor={id} className="text-sm/6 font-medium text-ink">
        {t.question}
      </label>
      <Textarea
        id={id}
        rows={2}
        autoFocus
        value={question}
        maxLength={WRITING_LIMITS.question.max}
        placeholder={t.questionPlaceholder}
        aria-describedby={error ? errorId : undefined}
        invalid={error !== null}
        onChange={(event) => {
          setQuestion(event.target.value);
          setError(null);
        }}
      />
      {error ? (
        <p id={errorId} className="text-sm text-fail-ink">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm">
          <action.icon aria-hidden />
          {action.label}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
