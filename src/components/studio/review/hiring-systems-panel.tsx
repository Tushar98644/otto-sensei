import { ChevronDown } from "lucide-react";
import { HiringNoteRow } from "@/components/studio/hiring-notes";
import { fileReadingNotes } from "@/lib/ats/systems";

export function HiringSystemsPanel() {
  const notes = fileReadingNotes();
  return (
    <details className="group">
      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 rounded-lg text-sm font-medium text-muted transition-colors duration-150 ease-out hover:text-ink [&::-webkit-details-marker]:hidden">
        How common hiring systems read files
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="mt-2 rounded-2xl bg-surface px-5 pt-4 pb-2 sm:px-6">
        <p className="text-sm/6 text-pretty text-muted">
          From each company&apos;s own help pages. Every employer sets its system up a little
          differently.
        </p>
        <ul className="mt-1 divide-y divide-border">
          {notes.map(({ system, note }) => (
            <HiringNoteRow key={system.id} note={note} title={system.name} />
          ))}
        </ul>
      </div>
    </details>
  );
}
