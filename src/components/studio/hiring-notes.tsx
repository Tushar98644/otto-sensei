import { ArrowUpRight } from "lucide-react";
import type { HiringNote } from "@/lib/ats/types";

// One documented fact about a hiring system, what to do about it, and the vendor page that says
// so. Shared by the Tailor step's job card and the recruiter view.

function SourceLink({ source }: { source: HiringNote["source"] }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 rounded-sm underline decoration-border-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
    >
      {source.label}
      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export type HiringNoteRowProps = {
  note: HiringNote;
  // The system's name, when the list mixes systems.
  title?: string;
};

export function HiringNoteRow({ note, title }: HiringNoteRowProps) {
  return (
    <li className="flex flex-col gap-1 py-3">
      {title ? <p className="text-sm/6 font-semibold text-ink">{title}</p> : null}
      <p className="text-sm/6 text-pretty text-ink">{note.fact}</p>
      <p className="text-sm/6 text-pretty text-muted">
        <span className="font-medium text-ink">What to do: </span>
        {note.todo}
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs/5 text-subtle">
        {note.optIn ? <span>Only if the employer turns it on</span> : null}
        <span>
          Source: <SourceLink source={note.source} />
        </span>
      </p>
    </li>
  );
}
