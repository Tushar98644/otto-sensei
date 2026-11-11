"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TITLE_MAX, cleanTitle, resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

export type RenameDialogProps = {
  resume: Resume | null;
  onClose: () => void;
  onRename: (resume: Resume, title: string) => void;
  // True when another resume already has this name; names must stay unique.
  isTaken: (title: string) => boolean;
};

export function RenameDialog({ resume, onClose, onRename, isTaken }: RenameDialogProps) {
  return (
    <Dialog
      open={resume !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="sm"
      title="Rename resume"
      description="Only you see this name. The PDF keeps your own name at the top."
    >
      {/* Keyed so every opening starts from the resume's current name. */}
      {resume ? (
        <RenameForm
          key={resume.id}
          resume={resume}
          onClose={onClose}
          onRename={onRename}
          isTaken={isTaken}
        />
      ) : null}
    </Dialog>
  );
}

function RenameForm({
  resume,
  onClose,
  onRename,
  isTaken,
}: { resume: Resume } & Omit<RenameDialogProps, "resume">) {
  const [draft, setDraft] = useState(resumeTitle(resume));
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = cleanTitle(draft);
    if (!next) {
      setError("Give it a name, like “Design roles 2026”.");
      return;
    }
    if (isTaken(next)) {
      setError(`You already have a resume called “${next}”. Pick another name.`);
      return;
    }
    onRename(resume, next);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <Field label="Name" error={error}>
        <Input
          value={draft}
          maxLength={TITLE_MAX}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onFocus={(event) => event.currentTarget.select()}
          data-autofocus
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save name</Button>
      </div>
    </form>
  );
}
