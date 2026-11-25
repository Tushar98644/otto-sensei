"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { TITLE_MAX, cleanTitle, resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

export type RenameDialogProps = {
  resume: Resume | null;
  onClose: () => void;
  onRename: (resume: Resume, title: string) => void;
  isTaken: (title: string) => boolean;
};

export function RenameDialog({ resume, onClose, onRename, isTaken }: RenameDialogProps) {
  const { rename } = useMessages("dashboard");
  return (
    <Dialog
      open={resume !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="sm"
      title={rename.title}
      description={rename.description}
    >
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
  const { rename } = useMessages("dashboard");
  const [draft, setDraft] = useState(resumeTitle(resume));
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = cleanTitle(draft);
    if (!next) {
      setError(rename.empty);
      return;
    }
    if (isTaken(next)) {
      setError(fmt(rename.taken, { name: next }));
      return;
    }
    onRename(resume, next);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <Field label={rename.name} error={error}>
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
          {rename.cancel}
        </Button>
        <Button type="submit">{rename.save}</Button>
      </div>
    </form>
  );
}
