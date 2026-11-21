"use client";

import { Copy } from "lucide-react";
import type { Ref } from "react";
import { DemoNote } from "@/components/studio/demo-note";
import type { OutreachDraft } from "@/components/studio/tailor/use-writing";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { copyText } from "@/components/ui/copy-text";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { liveWarnings, needsFirstName } from "@/lib/ai/warning-text";
import { WRITING_LIMITS } from "@/lib/writings/schema";
import type { OutreachField } from "./outreach-saved";

// The most a free LinkedIn account allows in an invite note; writeOutreach keeps to it.
const NOTE_CHARS = 200;

export type OutreachFieldsProps = {
  message: OutreachDraft;
  onEdit: (field: OutreachField, value: string) => void;
  // Fires when focus leaves a box, so an edit is saved without waiting for its pause.
  onSettle: () => void;
  subjectRef?: Ref<HTMLInputElement>;
};

export function OutreachFields({ message, onEdit, onSettle, subjectRef }: OutreachFieldsProps) {
  const noteOver = message.note.length > NOTE_CHARS;
  const firstName = needsFirstName(message.subject, message.email, message.note);
  const checks = liveWarnings(
    message.warnings,
    [message.subject, message.email, message.note].join("\n"),
    ["[first name]"],
  );
  return (
    <>
      {message.demo ? <DemoNote /> : null}
      {firstName || checks.length ? (
        <Alert variant="warn" title="Check before you send it">
          <ul className="flex list-disc flex-col gap-1 pl-4">
            {firstName ? (
              <li>Swap [first name] for the name of the person you&apos;re writing to.</li>
            ) : null}
            {checks.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Field label="Email subject">
          <Input
            ref={subjectRef}
            maxLength={WRITING_LIMITS.subject}
            value={message.subject}
            onChange={(event) => onEdit("subject", event.target.value)}
            onBlur={onSettle}
          />
        </Field>
        <Field
          label="Email"
          error={message.email.trim() ? null : "Write the email here. An empty one isn't saved."}
        >
          <Textarea
            autoResize
            maxLength={WRITING_LIMITS.outreachChars}
            value={message.email}
            onChange={(event) => onEdit("email", event.target.value)}
            onBlur={onSettle}
            className="max-h-[50vh] text-base/7 sm:text-sm/6"
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void copyText(message.subject, "subject")}
          >
            <Copy aria-hidden />
            Copy subject
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void copyText(message.email, "email")}
          >
            <Copy aria-hidden />
            Copy email
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Field
          label="LinkedIn note"
          hint={`${message.note.length} of ${NOTE_CHARS} characters, the most a free LinkedIn account allows.`}
          error={
            noteOver
              ? `${message.note.length} characters. Trim it to ${NOTE_CHARS} so it fits a free LinkedIn invite.`
              : null
          }
        >
          <Textarea
            autoResize
            maxLength={WRITING_LIMITS.noteChars}
            value={message.note}
            onChange={(event) => onEdit("note", event.target.value)}
            onBlur={onSettle}
            className="text-base/7 sm:text-sm/6"
          />
        </Field>
        <Button
          size="sm"
          variant="secondary"
          className="self-start"
          onClick={() => void copyText(message.note, "note")}
        >
          <Copy aria-hidden />
          Copy note
        </Button>
      </div>
    </>
  );
}

const SAVE_LINES: Record<"saving" | "saved", string> = {
  saving: "Saving…",
  saved: "Saved to Letters",
};

export function OutreachSaveStatus({
  save,
  error,
  onRetry,
}: {
  save: "idle" | "saving" | "saved" | "failed";
  error: string | null;
  onRetry: () => void;
}) {
  if (save === "failed") {
    return (
      <Alert
        variant="error"
        title="Not saved yet"
        action={
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        }
      >
        {error ? `${error} ` : null}It stays here while this page is open, so copy it before you
        leave.
      </Alert>
    );
  }
  return (
    <p role="status" className="min-h-5 text-sm text-subtle">
      {save === "idle" ? "" : SAVE_LINES[save]}
    </p>
  );
}
