"use client";

import { Check, PenLine, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PROMPTS } from "@/lib/career-log/entry";
import { monthLabel } from "@/lib/career-log/month";
import { ENTRY_FIELDS, type CareerLogEntry, type Month } from "@/lib/career-log/types";
import { EntryFields } from "./entry-fields";
import { SaveStatus } from "./save-status";
import { useEntryDraft } from "./use-entry-draft";

type EntryCardProps = {
  userId: string;
  month: Month;
  entry: CareerLogEntry | null;
  editing: boolean;
  onDone: () => void;
  onDelete: () => void;
};

export function EntryCard({ userId, month, entry, editing, onDone, onDelete }: EntryCardProps) {
  const [open, setOpen] = useState(editing);
  if (editing && !open) setOpen(true);
  const close = () => {
    setOpen(false);
    onDone();
  };
  return (
    <article
      aria-label={monthLabel(month)}
      className="grid gap-x-8 gap-y-3 py-5 sm:grid-cols-[10rem_minmax(0,1fr)]"
    >
      <div className="flex items-start justify-between gap-3 sm:flex-col sm:justify-start">
        <h3 className="font-display text-2xl/8 font-normal tracking-tight text-ink">
          {monthLabel(month)}
        </h3>
        {!open ? (
          <div className="flex gap-1 sm:-ml-2.5">
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
              <PenLine aria-hidden />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${monthLabel(month)}`}
              onClick={onDelete}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>
      {open ? (
        <EntryEditor userId={userId} month={month} entry={entry} onClose={close} />
      ) : entry ? (
        <EntryText entry={entry} />
      ) : null}
    </article>
  );
}

function EntryText({ entry }: { entry: CareerLogEntry }) {
  if (entry.nothingNew) {
    return <p className="text-sm/6 text-subtle">Nothing new this month.</p>;
  }
  return (
    <dl className="flex flex-col gap-3">
      {ENTRY_FIELDS.filter((field) => entry[field].trim()).map((field) => (
        <div key={field} className="flex flex-col gap-0.5">
          <dt className="text-xs/5 font-medium tracking-wide text-subtle">
            {PROMPTS[field].label}
          </dt>
          <dd className="text-base/7 text-pretty whitespace-pre-line text-ink">
            {entry[field].trim()}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EntryEditor({
  userId,
  month,
  entry,
  onClose,
}: {
  userId: string;
  month: Month;
  entry: CareerLogEntry | null;
  onClose: () => void;
}) {
  const draft = useEntryDraft(userId, month, entry);
  return (
    <div className="flex flex-col gap-5">
      <EntryFields draft={draft.draft} onChange={draft.change} onBlur={() => void draft.flush()} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SaveStatus state={draft.state} onRetry={() => void draft.flush()} />
        <Button
          variant="secondary"
          onClick={() => void draft.flush().then(onClose)}
          className="max-sm:w-full"
        >
          <Check aria-hidden />
          Done
        </Button>
      </div>
    </div>
  );
}
