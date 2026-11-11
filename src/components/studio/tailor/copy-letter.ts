import { COVER_LETTER_CHARS } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";

export function saveLetterOnCopy(copyId: string | null | undefined, text: string): void {
  if (!copyId) return;
  const store = useStudioStore.getState();
  const tailor = store.resumes[copyId]?.tailor;
  const letter = text.trim().slice(0, COVER_LETTER_CHARS);
  if (!tailor || (tailor.coverLetter ?? "") === letter) return;
  store.updateResume(copyId, (resume) => {
    if (!resume.tailor) return resume;
    const meta = { ...resume.tailor };
    delete meta.coverLetter;
    return { ...resume, tailor: letter ? { ...meta, coverLetter: letter } : meta };
  });
}
