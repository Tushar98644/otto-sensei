"use client";

import { ArrowUpRight } from "lucide-react";
import { useMessages } from "@/i18n/client";
import type { HiringNote } from "@/lib/ats/types";

function SourceLink({ source }: { source: HiringNote["source"] }) {
  const t = useMessages("studio").hiringNotes;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 rounded-sm underline decoration-border-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
    >
      {source.label}
      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only"> {t.newTab}</span>
    </a>
  );
}

export type HiringNoteRowProps = {
  note: HiringNote;
  title?: string;
};

export function HiringNoteRow({ note, title }: HiringNoteRowProps) {
  const t = useMessages("studio").hiringNotes;
  return (
    <li className="flex flex-col gap-1 py-3">
      {title ? <p className="text-sm/6 font-semibold text-ink">{title}</p> : null}
      <p className="text-sm/6 text-pretty text-ink">{note.fact}</p>
      <p className="text-sm/6 text-pretty text-muted">
        <span className="font-medium text-ink">{t.todo} </span>
        {note.todo}
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs/5 text-subtle">
        {note.optIn ? <span>{t.optIn}</span> : null}
        <span>
          {t.source} <SourceLink source={note.source} />
        </span>
      </p>
    </li>
  );
}
