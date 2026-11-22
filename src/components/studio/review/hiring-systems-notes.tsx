import { HiringNoteRow } from "@/components/studio/hiring-notes";
import { fileReadingNotes } from "@/lib/ats/systems";

export function HiringSystemsNotes() {
  return (
    <ul className="mt-1 divide-y divide-border">
      {fileReadingNotes().map(({ system, note }) => (
        <HiringNoteRow key={system.id} note={note} title={system.name} />
      ))}
    </ul>
  );
}
