import { ChevronRight } from "lucide-react";
import { HiringNoteRow } from "@/components/studio/hiring-notes";
import { fileReadingNotes } from "@/lib/ats/systems";

// The recruiter view's general version of the Tailor step's per-system notes: one documented fact
// per common system about how it reads a file. Folded away, since the checks come first.
export function HiringSystemsPanel() {
  const notes = fileReadingNotes();
  return (
    <details className="group rounded-2xl bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-ink hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
          aria-hidden
        />
        How common hiring systems read files
      </summary>
      <div className="px-4 pb-4">
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
