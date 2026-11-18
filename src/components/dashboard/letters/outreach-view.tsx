"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { OutreachFields } from "../jobs/outreach-fields";
import {
  outreachChange,
  type OutreachField,
  type OutreachFields as Fields,
} from "../jobs/outreach-saved";
import { OutreachSend } from "../jobs/outreach-send";
import { formatDay } from "../applications/view";
import { jobLine, type LetterEntry } from "./entries";

export type OutreachViewProps = {
  entry: LetterEntry;
  open: boolean;
  source: string;
  now: number;
  onClose: () => void;
  onSave: (entry: LetterEntry, fields: Fields) => Promise<boolean>;
};

type SaveState = "idle" | "saving" | "saved" | "failed";

const SAVE_LINES: Record<SaveState, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  failed: "Not saved yet",
};

export function fieldsOfEntry(entry: Pick<LetterEntry, "text" | "outreach">): Fields {
  return {
    subject: entry.outreach?.subject ?? "",
    email: entry.text,
    note: entry.outreach?.note ?? "",
  };
}

export function OutreachView({ entry, open, source, now, onClose, onSave }: OutreachViewProps) {
  const [fields, setFields] = useState(() => fieldsOfEntry(entry));
  const [save, setSave] = useState<SaveState>("idle");
  const changed = outreachChange(fields, fieldsOfEntry(entry)) !== null;

  async function settle() {
    if (!changed) return;
    setSave("saving");
    setSave((await onSave(entry, fields)) ? "saved" : "failed");
  }

  function edit(field: OutreachField, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setSave("idle");
  }

  const meta = [source ? `From “${source}”` : null, formatDay(entry.createdAt, now)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        void settle();
        onClose();
      }}
      size="lg"
      title={jobLine(entry) || "Outreach message"}
      description={meta}
    >
      <div className="flex flex-col gap-6">
        <OutreachFields
          message={{ ...fields, warnings: entry.warnings, demo: entry.demo }}
          onEdit={edit}
          onSettle={() => void settle()}
        />
        <p
          role="status"
          className={save === "failed" ? "text-sm text-fail-ink" : "min-h-5 text-sm text-subtle"}
        >
          {SAVE_LINES[save]}
        </p>
        <OutreachSend company={entry.company} title={entry.role} postText="" message={fields} />
      </div>
    </Dialog>
  );
}
